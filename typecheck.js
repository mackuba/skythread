import ts from 'typescript';
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const configPath = 'jsconfig.json';

let incrementalProgram;

export function runTypecheck() {
  let configFilePath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, configPath);
  let configFile = ts.readConfigFile(configFilePath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext([configFile.error], {
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getCanonicalFileName: x => x,
      getNewLine: () => ts.sys.newLine
    }));
  }

  let parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(configFilePath),
    { noEmit: true, incremental: true, tsBuildInfoFile: ".tsbuildinfo" },
    configFilePath
  );

  let host = ts.createIncrementalCompilerHost(parsedConfig.options);

  let program = ts.createIncrementalProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
    host,
    oldProgram: incrementalProgram && incrementalProgram.getProgram()
  });

  incrementalProgram = program;

  // TODO
  // https://github.com/microsoft/TypeScript/pull/31432
  // https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API/8e7d4bd1c85622cf078303075cbdf95a0a1bc8ab

  let diags = ts
    .getPreEmitDiagnostics(program.getProgram())
    .concat(program.getSemanticDiagnostics?.() ?? []);

  let formatHost = {
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getCanonicalFileName: x => x,
    getNewLine: () => ts.sys.newLine
  };

  let ok = (diags.length === 0);
  let text = ts.formatDiagnosticsWithColorAndContext(diags, formatHost);

  return { ok, text };
}
