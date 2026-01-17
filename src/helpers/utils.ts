import * as vscode from "vscode";

const getApiKey = async (
  context: vscode.ExtensionContext,
): Promise<{ hasApiKey: boolean; apiKey: string }> => {
  const apiKey = await context.secrets.get("apiKey");
  return { hasApiKey: !!apiKey, apiKey: apiKey || "" };
};

const validateApiKey = (apiKey: string): boolean => {
  const regex =
    /^foccus-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(apiKey);
};

export { getApiKey, validateApiKey };
