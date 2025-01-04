const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const sequelize = require("./database/database");
const Auth = require("./models/auth");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Settings = require("./models/settings");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const BASE_URL = `${process.env.BASE_URL}:${port}` || `http://localhost:${port}`;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database connection with retry logic
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      await Auth.sync({ alter: true });
      await Settings.sync({ alter: true });

      console.log('Connection to the database has been established successfully.');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
    }
  }
};

// Initialize database connection
connectDB().catch(error => {
  console.error('Unable to connect to the database:', error);
  process.exit(1); // Exit if we can't connect to the database
});


// Express Server for OAuth2
app.get("/", (req, res) => {
  res.send("Hello! Visit /auth to authorize the bot.");
});

// Endpoint to Redirect Users to Discord Auth
app.get("/auth", (req, res) => {
  const redirectURI = `${BASE_URL}/callback`;
  const clientID = process.env.CLIENT_ID;

  if (!clientID) {
    return res.status(500).json({ error: 'Missing CLIENT_ID configuration' });
  }

  const authURL = `https://discord.com/api/oauth2/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(
    redirectURI
  )}&response_type=code&scope=guilds.join+identify`;
  res.redirect(authURL);
});


// Endpoint to Handle Callback from Discord
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Authorization code missing.");
  }

  try {
    // Exchange the code for an access token
    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${BASE_URL}/callback`,
      scope: "identify guilds.join",
    });

    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      console.error("Discord API Error:", data);
      return res.status(400).send("Failed to get access token from Discord.");
    }

    // Get User's ID
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.id) {
      console.error("Failed to fetch user data:", userData);
      return res.status(400).json({
        error: "Failed to fetch user data from Discord"
      });
    }


    // Save user to the database
    try {
      await Auth.findOrCreate({
        where: { discord_id: userData.id },
        defaults: {
          discord_id: userData.id,
          email: null,
          access_token: data.access_token,
        },
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).send("Failed to save user data.");
    }

    // Step 1: Create a DM channel
    const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: userData.id }),
    });
    if (!dmChannelResponse.ok) {
      console.error("Failed to fetch DM channel:", dmChannelResponse);
    }
    const dmChannelData = await dmChannelResponse.json();
    const channelId = dmChannelData.id;
    // Step 2: Send the message to the DM channel
    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: `✅ *You have successfully authorized the bot! Thank you!*` }),
    });
    if (!messageResponse.ok) {
      console.error("Failed to send DM:", messageResponse);
    }

    // Apply the role
    const [settings] = await Settings.findOrCreate({ where: { id: 0 } });

    const url = `https://discord.com/api/v10/guilds/${process.env.GUILD_ID}/members/${userData.id}/roles/${settings.auth_role}`;
    const roleResponse = await fetch(`${url}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${process.env.BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!roleResponse.ok) {
      console.log(`A problem occured adding a role for ${userData.id}`);
    }
  } catch (err) {
    console.error("Error during authorization:", err);
    res.status(500).send("Internal server error during authorization.");
  }
  if (process.env.GUILD_ID) {
    const discordServerURL = `https://discord.com/channels/${process.env.GUILD_ID}`;
    res.redirect(discordServerURL);
  } else {
    res.send("Authorization successful!");
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the Server
const server = app.listen(port, () => {
  console.log(`Server running on ${BASE_URL}`);
});
