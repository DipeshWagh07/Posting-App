import {
  getLinkedInAuthUrl,
  getAccessToken,
  postToLinkedIn,
  generateState,
} from "../utils/linkedinAuth.js";

// GET route to start OAuth flow
export const startLinkedInAuth = (req, res) => {
  const state = generateState();
  req.session.state = state;
  const authUrl = getLinkedInAuthUrl();
  res.redirect(authUrl);
};

// GET callback from LinkedIn (if using redirect-based login)
export const linkedInCallback = async (req, res) => {
  const { code, state } = req.query;

  if (state !== req.session.state) {
    return res.status(400).send("State mismatch. Potential CSRF attack.");
  }

  try {
    const accessToken = await getAccessToken(code);
    await postToLinkedIn(accessToken, { content: "Hello LinkedIn!" });
    res.send("Posted to LinkedIn!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to authenticate or post to LinkedIn.");
  }
};

// POST endpoint for frontend to exchange code for access token
export const handleCodeExchange = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code." });
  }

  try {
    const accessToken = await getAccessToken(code);
    res.json({ accessToken });
  } catch (err) {
    console.error("Token exchange failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Token exchange failed." });
  }
};
