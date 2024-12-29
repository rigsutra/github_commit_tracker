import * as vscode from "vscode";
import { Octokit } from "@octokit/rest";
import * as http from "http";
import open from "open";

const GITHUB_CLIENT_ID = "your-client-id"; // Replace with your GitHub Client ID
const GITHUB_CLIENT_SECRET = "your-client-secret"; // Replace with your GitHub Client Secret
const REDIRECT_URI = "http://localhost:3000"; // This should match your OAuth app's callback URL

let octokit: Octokit | undefined;

// Function to start the authentication process
async function authenticate() {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`;

  // Open the authorization URL in the user's default browser
  await open(authUrl);

  // Start a simple HTTP server to listen for the redirect
  const server = http.createServer(async (req, res) => {
    const query = new URL(req.url || "", `http://${req.headers.host}`)
      .searchParams;
    const code = query.get("code");

    if (code) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Authentication successful! You can close this tab.");

      // Exchange the code for an access token
      try {
        const response = await fetch(
          `https://github.com/login/oauth/access_token`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
            },
            body: JSON.stringify({
              client_id: GITHUB_CLIENT_ID,
              client_secret: GITHUB_CLIENT_SECRET,
              code,
            }),
          }
        );

        const data = await response.json();
        if (data.access_token) {
          octokit = new Octokit({ auth: data.access_token });
          vscode.window.showInformationMessage("Authenticated successfully.");
        } else {
          vscode.window.showErrorMessage(
            "Failed to authenticate. Please check the console for details."
          );
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        vscode.window.showErrorMessage(
          "Failed to authenticate. Please check the console for details."
        );
      }

      server.close(); // Close the HTTP server after authentication
    }
  });

  server.listen(3000, () => {
    console.log("Listening for authentication on port 3000...");
  });
}

// Function to fetch commits from all repositories of the authenticated user
async function fetchCommits() {
  if (!octokit) {
    vscode.window.showErrorMessage("Please authenticate first.");
    return;
  }

  try {
    const repos = await octokit.repos.listForAuthenticatedUser();
    let commitData = "";

    for (const repo of repos.data) {
      const commits = await octokit.repos.listCommits({
        owner: repo.owner.login,
        repo: repo.name,
      });

      // Log commit data
      commits.data.forEach((commit) => {
        commitData += `Repo: ${repo.name}, Commit: ${commit.sha}, Message: ${commit.commit.message}\n`;
      });
      console.log(`Commits for ${repo.name}:`, commits.data);
    }

    // Log commits to central repository if needed
    if (commitData) {
      await logCommitsToCentralRepo(commitData);
    }
  } catch (error) {
    console.error("Failed to fetch commits:", error);
    vscode.window.showErrorMessage(
      "Failed to fetch commits. Please check the console for more details."
    );
  }
}

// Function to log commit data to a central repository (similar to previous implementation)
async function logCommitsToCentralRepo(commitData: string) {
  const owner = "your-github-username"; // Replace with your GitHub username
  const repo = "central-repo"; // Replace with your central repository name

  try {
    await octokit?.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "commit-log.txt",
      message: "Update commit log",
      content: Buffer.from(commitData).toString("base64"),
    });

    vscode.window.showInformationMessage("Commit log updated successfully.");
  } catch (error) {
    console.error("Failed to update log:", error);
    vscode.window.showErrorMessage(
      "Failed to update log. Please check the console for more details."
    );
  }
}

// Set an interval to fetch commits every 30 minutes
setInterval(async () => {
  await fetchCommits();
}, 30 * 60 * 1000); // 30 minutes

// Activate function where commands are registered
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.authenticate", async () => {
      await authenticate();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.fetchCommits", async () => {
      await fetchCommits();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("extension.logCommits", async () => {
      const commitData = "Sample commit data"; // Replace with actual commit data
      await logCommitsToCentralRepo(commitData);
    })
  );
}

// Deactivate function for cleanup
export function deactivate() {
  // Clean up resources if needed
  octokit = undefined;
}
