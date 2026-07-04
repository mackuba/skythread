import highlightJs from 'highlight.js/lib/core';

import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import clojure from 'highlight.js/lib/languages/clojure';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import dart from 'highlight.js/lib/languages/dart';
import elixir from 'highlight.js/lib/languages/elixir';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import nix from 'highlight.js/lib/languages/nix';
import objectivec from 'highlight.js/lib/languages/objectivec';
import ocaml from 'highlight.js/lib/languages/ocaml';
import perl from 'highlight.js/lib/languages/perl';
import php from 'highlight.js/lib/languages/php';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import r from 'highlight.js/lib/languages/r';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const languages = {
  bash, c, clojure, cpp, csharp, css, dart, elixir, go, java, javascript, json, kotlin, markdown, nix,
  objectivec, ocaml, perl, php, powershell, python, r, ruby, rust, sql, swift, typescript, xml, yaml
};

for (let [name, language] of Object.entries(languages)) {
  highlightJs.registerLanguage(name, language);
}

const languageAliases: Record<string, string> = {
  'c#': 'csharp',
  'c++': 'cpp',
  cplusplus: 'cpp',
  cs: 'csharp',
  csharp: 'csharp',
  html: 'xml',
  js: 'javascript',
  md: 'markdown',
  objc: 'objectivec',
  py: 'python',
  rs: 'rust',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  yml: 'yaml'
};

type HighlightedCode =
  | { kind: 'highlighted', html: string }
  | { kind: 'plain', text: string };

export function highlightCodeBlock(code: string, language: string | undefined): HighlightedCode {
  let normalizedLanguage = normalizeLanguage(language);

  if (!normalizedLanguage || !highlightJs.getLanguage(normalizedLanguage)) {
    return { kind: 'plain', text: code };
  }

  return {
    kind: 'highlighted',
    html: highlightJs.highlight(code, { language: normalizedLanguage, ignoreIllegals: true }).value
  };
}

function normalizeLanguage(language: string | undefined): string | undefined {
  if (!language) { return undefined; }

  let lowercase = language.toLowerCase();
  return languageAliases[lowercase] ?? lowercase;
}
