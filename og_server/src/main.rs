use hyper::header::{HeaderValue, CONTENT_TYPE, USER_AGENT};
use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Method, Request, Response, Server, StatusCode};
use serde::Deserialize;
use std::collections::HashMap;
use std::convert::Infallible;
use std::env;
use std::io::ErrorKind;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use url::form_urlencoded;
use url::Url;

const APP_VIEW: &str = "public.api.bsky.app";
const DEFAULT_PORT: u16 = 3000;

const META_CHARSET_LINE: &str = r#"<meta charset="UTF-8">"#;
const TITLE_CLOSE: &str = "</title>";

#[derive(Clone)]
struct AppState {
    index_html: Arc<String>,
    http_client: reqwest::Client,
}

#[derive(Deserialize)]
struct ResolveHandleResponse {
    did: String,
}

#[derive(Deserialize)]
struct GetPostsResponse {
    posts: Vec<PostView>,
}

#[derive(Deserialize)]
struct PostView {
    author: ProfileViewBasic,
    record: Record,
}

#[derive(Deserialize)]
struct ProfileViewBasic {
    handle: String,
}

#[derive(Deserialize)]
struct Record {
    text: String,
}

#[tokio::main]
async fn main() {
    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(DEFAULT_PORT);

    let index_path = env::var("INDEX")
        .unwrap_or_else(|_| "./index.html".to_string());

    let index_html = match std::fs::read_to_string(&index_path) {
        Ok(contents) => contents,
        Err(error) => match error.kind() {
            ErrorKind::NotFound => {
                eprintln!("Error: Index file not found at {}. Create an index.html file, or pass an INDEX=path env var.", index_path);
                std::process::exit(1);
            }
            _ => {
                eprintln!("Error: Failed to read index file {}: {}", index_path, error);
                std::process::exit(1);
            }
        },
    };

    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .expect("Failed to build HTTP client");

    let state = AppState {
        index_html: Arc::new(index_html),
        http_client,
    };

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    println!("Starting server on http://localhost:{}", port);

    let make_svc = make_service_fn(move |_| {
        let state = state.clone();
        async move {
            Ok::<_, Infallible>(service_fn(move |request| {
                handle_request(request, state.clone())
            }))
        }
    });

    let server = match Server::try_bind(&addr) {
        Ok(builder) => builder.serve(make_svc),
        Err(e) => {
            eprintln!("Error: failed to start a server: {}", e);
            std::process::exit(1);
        }
    };

    if let Err(error) = server.with_graceful_shutdown(shutdown_signal()).await {
        eprintln!("Server error: {}", error);
    }
}

async fn shutdown_signal() {
    let ctrl_c = tokio::signal::ctrl_c();

    let mut sigterm = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        .expect("Failed to install SIGTERM handler");

    tokio::select! {
        _ = ctrl_c => {},
        _ = sigterm.recv() => {},
    }
}

async fn handle_request(
    request: Request<Body>,
    state: AppState,
) -> Result<Response<Body>, Infallible> {
    // we only handle GET / requests
    if request.method() != Method::GET || request.uri().path() != "/" {
        return Ok(response_with_status(StatusCode::NOT_FOUND));
    }

    let Some(query) = request.uri().query() else {
        // if there are no params, return index.html unchanged
        return Ok(html_response(state.index_html.as_str().to_string()));
    };

    // otherwise, we want to at least add a meta robots noindex
    let mut html = add_meta_robots(state.index_html.as_str());

    let user_agent = request.headers()
        .get(USER_AGENT)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");

    if is_likely_normal_browser(user_agent) {
        // fast path for browsers, to not make the user wait longer
        return Ok(html_response(html));
    }

    let params = parse_query_params(query);

    if let Some(q) = params.get("q") {
        if let Some((profile, rkey)) = parse_bsky_post_url(q) {
            if let Ok(post) = fetch_post(&state.http_client, &profile, &rkey).await {
                html = add_post_meta(&html, post);
            }
        }

        return Ok(html_response(html));
    }

    if let (Some(profile), Some(rkey)) = (params.get("author"), params.get("post")) {
        if let Ok(post) = fetch_post(&state.http_client, profile, rkey).await {
            html = add_post_meta(&html, post);
        }

        return Ok(html_response(html));
    }

    if let Some(hashtag) = params.get("hash") {
        let description = format!("Posts tagged with #{}", hashtag);
        html = add_meta_after_title(
            &html,
            &format!(
                r#"  <meta property="og:description" content="{}">"#,
                escape_html_attr(&description)
            ),
        );
        return Ok(html_response(html));
    }

    if let Some(quotes) = params.get("quotes") {
        if let Some((profile, rkey)) = parse_bsky_post_url(quotes) {
            if let Ok(post) = fetch_post(&state.http_client, &profile, &rkey).await {
                let description = format!(r#"Quotes of: "{}""#, normalize_text(&post.record.text));
                html = add_meta_after_title(
                    &html,
                    &format!(
                        r#"  <meta property="og:description" content="{}">"#,
                        escape_html_attr(&description)
                    ),
                );
            }
        }

        return Ok(html_response(html));
    }

    if let Some(page) = params.get("page") {
        let description = match (page.as_str(), params.get("mode").map(String::as_str)) {
            ("search", Some("likes")) => Some("Archive search"),
            ("search", _) => Some("Timeline search"),
            ("posting_stats", _) => Some("Posting stats"),
            ("like_stats", _) => Some("Like stats"),
            _ => None,
        };

        if let Some(description) = description {
            html = add_meta_after_title(
                &html,
                &format!(
                    r#"  <meta property="og:description" content="{}">"#,
                    escape_html_attr(description)
                ),
            );
        }

        return Ok(html_response(html));
    }

    Ok(html_response(html))
}

fn response_with_status(status: StatusCode) -> Response<Body> {
    Response::builder()
        .status(status)
        .body(Body::empty())
        .unwrap_or_else(|_| Response::new(Body::empty()))
}

fn html_response(body: String) -> Response<Body> {
    let mut response = Response::new(Body::from(body));
    response.headers_mut().insert(
        CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    response
}

fn parse_query_params(query: &str) -> HashMap<String, String> {
    form_urlencoded::parse(query.as_bytes())
        .into_owned()
        .collect()
}

fn is_likely_normal_browser(user_agent: &str) -> bool {
    user_agent.starts_with("Mozilla/5.0")
        && !user_agent.contains("http:")
        && !user_agent.contains("https:")
        && !user_agent.contains("mailto:")
}

fn add_meta_robots(html: &str) -> String {
    let insert = format!("{META_CHARSET_LINE}\n  <meta name=\"robots\" content=\"noindex, nofollow\">");
    html.replacen(META_CHARSET_LINE, &insert, 1)
}

fn add_meta_after_title(html: &str, meta: &str) -> String {
    let insert = format!("{TITLE_CLOSE}\n{meta}");
    html.replacen(TITLE_CLOSE, &insert, 1)
}

fn add_post_meta(html: &str, post: PostView) -> String {
    let title = format!("Skythread • Post by @{}", post.author.handle);

    let og_title = format!(r#"  <meta property="og:title" content="{}">"#,
        escape_html_attr(&title));
    let og_description = format!(r#"  <meta property="og:description" content="{}">"#,
        escape_html_attr(&normalize_text(&post.record.text)));

    add_meta_after_title(&*html, &format!("{}\n{}", og_title, og_description))
}

fn parse_bsky_post_url(url_str: &str) -> Option<(String, String)> {
    let url = Url::parse(url_str).ok()?;
    if url.scheme() != "http" && url.scheme() != "https" {
        return None;
    }

    let segments: Vec<&str> = url
        .path_segments()
        .map(|segments| segments.collect())
        .unwrap_or_default();

    if segments.len() < 4 || segments[0] != "profile" || segments[2] != "post" {
        return None;
    }

    Some((segments[1].to_string(), segments[3].to_string()))
}

async fn fetch_post(
    client: &reqwest::Client,
    handle_or_did: &str,
    rkey: &str,
) -> Result<PostView, ()> {
    let did = if handle_or_did.starts_with("did:") {
        handle_or_did.to_string()
    } else {
        resolve_handle(client, handle_or_did).await?
    };

    let at_uri = format!("at://{}/app.bsky.feed.post/{}", did, rkey);
    let encoded_uri: String = form_urlencoded::byte_serialize(at_uri.as_bytes()).collect();
    let request_url = format!(
        "https://{APP_VIEW}/xrpc/app.bsky.feed.getPosts?uris={}",
        encoded_uri
    );

    let response = client.get(request_url).send().await.map_err(|_| ())?;
    if !response.status().is_success() {
        return Err(());
    }

    let body: GetPostsResponse = response.json().await.map_err(|_| ())?;
    let post = body.posts.into_iter().next().ok_or(())?;

    Ok(post)
}

async fn resolve_handle(client: &reqwest::Client, handle: &str) -> Result<String, ()> {
    let encoded_handle: String = form_urlencoded::byte_serialize(handle.as_bytes()).collect();
    let request_url = format!(
        "https://{APP_VIEW}/xrpc/com.atproto.identity.resolveHandle?handle={}",
        encoded_handle
    );
    let response = client.get(request_url).send().await.map_err(|_| ())?;
    if !response.status().is_success() {
        return Err(());
    }

    let body: ResolveHandleResponse = response.json().await.map_err(|_| ())?;
    Ok(body.did)
}

fn normalize_text(text: &str) -> String {
    text.replace(['\n', '\r'], " ")
}

fn escape_html_attr(text: &str) -> String {
    let mut escaped = String::with_capacity(text.len());
    for ch in text.chars() {
        match ch {
            '&' => escaped.push_str("&amp;"),
            '"' => escaped.push_str("&quot;"),
            '<' => escaped.push_str("&lt;"),
            '>' => escaped.push_str("&gt;"),
            _ => escaped.push(ch),
        }
    }
    escaped
}
