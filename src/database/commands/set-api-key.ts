import * as vscode from "vscode";
import { getApiKey, validateApiKey } from "../../helpers/utils";
import { ActivityState } from "../../activity-state";
import { API_KEY_DISMISSED } from "../../helpers/const";

const requireApiKey = async (
  context: vscode.ExtensionContext,
  state: ActivityState,
  apiKey?: string,
): Promise<string | null> => {
  try {
    if (typeof apiKey === "undefined") {
      apiKey = (await getApiKey(context)).apiKey;
    }

    const result = await vscode.window.showInputBox({
      prompt: "Insert your API key to enable the extension",
      ignoreFocusOut: true,
      placeHolder: "API Key example: foccus-xxxxxx...",
      password: true,
      value: apiKey || "",
      validateInput: (value: string) => {
        if (!value.trim()) {
          return "API key cannot be empty";
        }
        if (!validateApiKey(value)) {
          return "Invalid API key format. check: https://foccusdev.xyz/api-key";
        }

        return null;
      },
    });

    if (apiKey && (apiKey === result || "")) {
      return apiKey;
    }

    if (!result) {
      vscode.window
        .showErrorMessage(
          "API key is required to use the extension. Try again to work properly.",
          "Set API Key",
        )
        .then((choice) => {
          if (choice === "Set API Key") {
            vscode.commands.executeCommand("foccusdev.setApiKey");
          }
        });
      return null;
    }

    await context.secrets.store("apiKey", result);
    vscode.window.showInformationMessage("API key saved successfully!");
    await context.globalState.update(API_KEY_DISMISSED, false);
    state.setApiKey();

    return result;
  } catch (error) {
    vscode.window.showErrorMessage(
      "An error occurred while setting the API key. Try again.",
    );
    return null;
  }
};

export { requireApiKey };
