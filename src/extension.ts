import * as _ from "lodash";
import * as changeCase from "change-case";
import * as mkdirp from "mkdirp";

import {
  commands,
  ExtensionContext,
  InputBoxOptions,
  OpenDialogOptions,
  QuickPickOptions,
  Uri,
  window
} from "vscode";
import { existsSync, lstatSync, writeFile, appendFile } from "fs";
import {
  getBarrelTemplate,
  getBlocEventTemplate,
  getBlocStateTemplate,
  getBlocTemplate
} from "./templates";
import { analyzeDependencies } from "./utils";

export function activate (_context: ExtensionContext) {
  analyzeDependencies();

  commands.registerCommand("extension.new-feature", async (uri: Uri) => {
    // Show feature prompt
    let featureName = await promptForFeatureName();

    // Abort if name is not valid
    if (!isNameValid(featureName)) {
      window.showErrorMessage('The name must not be empty');
      return;
    }
    featureName = `${featureName}`;

    let targetDirectory = '';
    try {
      targetDirectory = await getTargetDirectory(uri);
    } catch (error) {
      window.showErrorMessage(error.message);
    }

    const useEquatable = await promptForUseEquatable();

    const pascalCaseFeatureName = changeCase.pascalCase(featureName.toLowerCase());
    try {
      await generateFeatureArchitecture(`${featureName}`, targetDirectory, useEquatable);
      window.showInformationMessage(
        `Successfully Generated ${pascalCaseFeatureName} Feature`
      );
    } catch (error) {
      window.showErrorMessage(
        `Error:
        ${error instanceof Error ? error.message : JSON.stringify(error)}`
      );
    }
  });
}

export function isNameValid (featureName: string | undefined): boolean {
  // Check if feature name exists
  if (!featureName) {
    return false;
  }
  // Check if feature name is null or white space
  if (_.isNil(featureName) || featureName.trim() === '') {
    return false;
  }

  // Return true if feature name is valid
  return true;
}

export async function getTargetDirectory (uri: Uri): Promise<string> {
  let targetDirectory;
  if (_.isNil(_.get(uri, "fsPath")) || !lstatSync(uri.fsPath).isDirectory()) {
    targetDirectory = await promptForTargetDirectory();
    if (_.isNil(targetDirectory)) {
      throw Error('Please select a valid directory');
    }
  } else {
    targetDirectory = uri.fsPath;
  }

  return targetDirectory;
}

export async function promptForTargetDirectory (): Promise<string | undefined> {
  const options: OpenDialogOptions = {
    canSelectMany: false,
    openLabel: "Select a folder to create the feature in",
    canSelectFolders: true
  };

  return window.showOpenDialog(options).then(uri => {
    if (_.isNil(uri) || _.isEmpty(uri)) {
      return undefined;
    }
    return uri[0].fsPath;
  });
}

export function promptForFeatureName (): Thenable<string | undefined> {
  const blocNamePromptOptions: InputBoxOptions = {
    prompt: "Feature Name",
    placeHolder: "login"
  };
  return window.showInputBox(blocNamePromptOptions);
}

export async function promptForUseEquatable (): Promise<boolean> {
  const useEquatablePromptValues: string[] = ["no (default)", "yes (advanced)"];
  const useEquatablePromptOptions: QuickPickOptions = {
    placeHolder:
      "Do you want to use the Equatable Package in bloc to override equality comparisons?",
    canPickMany: false
  };

  const answer = await window.showQuickPick(
    useEquatablePromptValues,
    useEquatablePromptOptions
  );

  return answer === "yes (advanced)";
}

export async function generateBlocCode (
  blocName: string,
  targetDirectory: string,
  useEquatable: boolean
) {
  const blocDirectoryPath = `${targetDirectory}/bloc`;
  if (!existsSync(blocDirectoryPath)) {
    await createDirectory(blocDirectoryPath);
  }

  await Promise.all([
    createBlocEventTemplate(blocName, targetDirectory, useEquatable),
    createBlocStateTemplate(blocName, targetDirectory, useEquatable),
    createBlocTemplate(blocName, targetDirectory),
    createBarrelTemplate(blocName, targetDirectory)
  ]);
}

export async function generateFeatureArchitecture (
  featureName: string,
  targetDirectory: string,
  useEquatable: boolean
) {

  // Create the features directory if its does not exist yet
  const featuresDirectoryPath = getFeaturesDirectoryPath(targetDirectory);
  if (!existsSync(featuresDirectoryPath)) {
    await createDirectory(featuresDirectoryPath);
  }

  // Create the feature directory
  const featureDirectoryPath = `${featuresDirectoryPath}/${featureName}`;
  await createDirectory(featureDirectoryPath);

  // Create the data layer
  const dataDirectoryPath = `${featureDirectoryPath}/data`;
  await createDirectories(dataDirectoryPath, ['datasources', 'models', 'repositories']);

  // Create the domain layer
  const domainDirectoryPath = `${featureDirectoryPath}/domain`;
  await createDirectories(domainDirectoryPath, ['entities', 'repositories', 'usecases']);

  // Create the presentation layer
  const presentationDirectoryPath = `${featureDirectoryPath}/presentation`;
  await createDirectories(presentationDirectoryPath, ['bloc', 'pages', 'widgets']);

  // Generate the bloc code in the presentation layer
  await generateBlocCode(featureName, presentationDirectoryPath, useEquatable);
}

export function getFeaturesDirectoryPath (currentDirectory: string): string {
  // Split the path
  const splitPath = currentDirectory.split('\\');

  // Remove trailing \
  if (splitPath[splitPath.length - 1] === '') {
    splitPath.pop();
  }

  // Rebuild path
  const result = splitPath.join('\\');

  // Determines whether we're already in the features directory or not
  const isDirectoryAlreadyFeatures = splitPath[splitPath.length - 1] === 'features';

  // If already return the current directory if not, return the current directory with the /features append to it
  return isDirectoryAlreadyFeatures ? result : `${result}\\features`;
}

export async function createDirectories (targetDirectory: string, childDirectories: string[]): Promise<void> {
  // Create the parent directory
  await createDirectory(targetDirectory);
  // Creat the children
  childDirectories.map(async directory => await createDirectory(`${targetDirectory}/${directory}`));
}

export function createDirectory (targetDirectory: string): Promise<void> {
  return new Promise((resolve, reject) => {
    mkdirp(targetDirectory, error => {
      if (error) {
        return reject(error);
      }
      resolve();
    });
  });
}

export function createBlocEventTemplate (
  blocName: string,
  targetDirectory: string,
  useEquatable: boolean
) {
  const snakeCaseBlocName = changeCase.snakeCase(blocName.toLowerCase());
  const targetPath = `${targetDirectory}/bloc/${snakeCaseBlocName}_event.dart`;
  if (existsSync(targetPath)) {
    throw Error(`${snakeCaseBlocName}_event.dart already exists`);
  }
  return new Promise(async (resolve, reject) => {
    writeFile(
      targetPath,
      getBlocEventTemplate(blocName, useEquatable),
      "utf8",
      (error: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
}

export function createBlocStateTemplate (
  blocName: string,
  targetDirectory: string,
  useEquatable: boolean
) {
  const snakeCaseBlocName = changeCase.snakeCase(blocName.toLowerCase());
  const targetPath = `${targetDirectory}/bloc/${snakeCaseBlocName}_state.dart`;
  if (existsSync(targetPath)) {
    throw Error(`${snakeCaseBlocName}_state.dart already exists`);
  }
  return new Promise(async (resolve, reject) => {
    writeFile(
      targetPath,
      getBlocStateTemplate(blocName, useEquatable),
      "utf8",
      (error: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
}

export function createBlocTemplate (blocName: string, targetDirectory: string) {
  const snakeCaseBlocName = changeCase.snakeCase(blocName.toLowerCase());
  const targetPath = `${targetDirectory}/bloc/${snakeCaseBlocName}_bloc.dart`;
  if (existsSync(targetPath)) {
    throw Error(`${snakeCaseBlocName}_bloc.dart already exists`);
  }
  return new Promise(async (resolve, reject) => {
    writeFile(targetPath, getBlocTemplate(blocName), "utf8", (error: any) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export function createBarrelTemplate (blocName: string, targetDirectory: string) {
  const targetPath = `${targetDirectory}/bloc/bloc.dart`;
  if (existsSync(targetPath)) {
    return new Promise((resolve, reject) => {
      appendFile(targetPath, getBarrelTemplate(blocName), "utf8", (error: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
  return new Promise(async (resolve, reject) => {
    writeFile(targetPath, getBarrelTemplate(blocName), "utf8", (error: any) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
