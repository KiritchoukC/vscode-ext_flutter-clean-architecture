import * as yaml from "js-yaml";
import { getPubspecPath } from "./get-pubspec-path";
import * as vscode from "vscode";

export async function getPubspec () {
  const pubspecPath = getPubspecPath();
  if (pubspecPath) {
    try {
      let content = await vscode.workspace.fs.readFile(vscode.Uri.file(pubspecPath));
      return yaml.safeLoad(content.toString());
    } catch (_) { }
  }
}