server "skythread.mackuba.eu"

set :application, "skythread"
set :repository, "https://tangled.org/mackuba.eu/skythread"
set :keep_releases, 10
set :shared_children, []
set :copy_exclude, [
  '.git*', '.tm*', '.zed', '*.js', '*.lock', '*.md', '*.sh', '*.toml', 'lib', 'src', 'package.json', 'tsconfig.json'
]

after 'deploy', 'deploy:make_noindex'

namespace :deploy do
  task :make_noindex do
    timestamp = Time.now.to_i

    script = %(
      cat index.html | sed -E 's/\\.(js|css|png|jpg)"/.\\1?#{timestamp}"/g' > timestamped.html

      cp timestamped.html index.html
      rm timestamped.html
    )

    put script, "#{current_path}/script.sh", mode: 0755
    run "cd #{current_path} && ./script.sh && rm script.sh"

    run_locally "bun production"

    top.upload "dist/skythread.js", "#{current_path}/dist/skythread.js"
    top.upload "dist/skythread.js.map", "#{current_path}/dist/skythread.js.map"
    top.upload "dist/skythread.css", "#{current_path}/dist/skythread.css"
    top.upload "dist/highlight.js", "#{current_path}/dist/highlight.js"
    top.upload "dist/highlight.js.map", "#{current_path}/dist/highlight.js.map"
  end
end
