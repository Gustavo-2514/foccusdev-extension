import * as vscode from "vscode";

const getApiKey = async (
  context: vscode.ExtensionContext
): Promise<string | undefined> => {
  try {
    let apiKey = await context.secrets.get("apiKey");
    if (!apiKey) {
      const result = await vscode.window.showInputBox({
        prompt: "Insert your API key to enable the extension",
        ignoreFocusOut: true,
        placeHolder: "API Key example: foccus-xxxxxx...",
        password: true,
      });

      if (!result) {
        vscode.window.showErrorMessage(
          "API key is required to use the extension."
        );
        return undefined;
      }

      apiKey = result;
      await context.secrets.store("apiKey", result);
    }

    if (validateApiKey(apiKey)) return apiKey;
    else {
      vscode.window.showErrorMessage(
        "The provided API key is invalid. check: https://foccusdev.xyz/api-key"
      );
      await context.secrets.delete("apiKey");
      return undefined;
    }
  } catch (error) {
    console.log("Failed to get api key");
  }
};

const validateApiKey = (apiKey: string): boolean => {
  const regex = new RegExp(
    "^foccus-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
  );
  return regex.test(apiKey);
};

export { getApiKey, validateApiKey };