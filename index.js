const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(403).json({ message: "Unauthorized" });
  }
};

// Endpoint to get current funds
app.get("/api/get-funds", verifyToken, async (req, res) => {
  const userId = req.user.uid;

  try {
    // Retrieve user data from Firestore
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }
    const userData = userDoc.data();

    // Send back the balance
    res.status(200).json({ balance: userData.balance });
  } catch (error) {
    console.error("Error retrieving funds:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// add funds to balance
app.post("/api/add-funds", verifyToken, async (req, res) => {
  const { deposit } = req.body;
  const userId = req.user.uid;

  try {
    // Retrieve user data from Firestore
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    const userData = userDoc.data();

    // Update balance
    userData.balance += deposit;

    // Save updated data
    await admin.firestore().collection("users").doc(userId).set(userData);

    res.status(200).json({ message: "Funds added successfully" });
  } catch (error) {
    console.error("Error adding funds:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// withdraw funds
app.post("/api/withdraw-funds", verifyToken, async (req, res) => {
  const { withdrawAmount } = req.body;
  const userId = req.user.uid;

  try {
    // Retrieve user data from Firestore
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    const userData = userDoc.data();

    // Check if sufficient balance
    if (userData.balance < withdrawAmount) {
      return res.status(400).json({ message: "Not enough funds" });
    }

    // Update balance
    userData.balance -= withdrawAmount;

    // Save updated data
    await admin.firestore().collection("users").doc(userId).set(userData);

    res.status(200).json({ message: "Funds withdrawn successfully" });
  } catch (error) {
    console.error("Error withdrawing funds:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// toggle playing mode
app.post("/api/toggle-playing-mode", verifyToken, async (req, res) => {
  const userId = req.user.uid;

  try {
    // Retrieve user data from Firestore
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    const userData = userDoc.data();

    // Toggle playing mode
    userData.isPlaying = !userData.isPlaying;

    // Save updated data
    await admin.firestore().collection("users").doc(userId).set(userData);

    res.status(200).json({ message: "Playing mode toggled successfully" });
  } catch (error) {
    console.error("Error toggling playing mode:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/double", verifyToken, async (req, res) => {
  const { choice, bet } = req.body;
  const userId = req.user.uid;

  try {
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }
    const userData = userDoc.data();

    const card = Math.floor(Math.random() * 13) + 1;
    const suits = [
      { name: "Spade", icon: "♠️" },
      { name: "Heart", icon: "❤️" },
      { name: "Diamond", icon: "♦️" },
      { name: "Club", icon: "♣️" },
    ];
    const suitIndex = Math.floor(Math.random() * suits.length);
    const cardSuit = suits[suitIndex].icon;

    let winStatus = "Lose"; // Default status
    let resultAmount = 0;
    if (
      (choice === "small" && card >= 1 && card <= 6) ||
      (choice === "big" && card >= 8 && card <= 13)
    ) {
      winStatus = "Win";
      resultAmount = bet * 2;
    } else if (card === 7) {
      winStatus = "Draw";
    } else {
      userData.balance -= bet;
    }

    // Save updated data
    await admin.firestore().collection("users").doc(userId).update(userData);

    // Respond with card details and win status
    res.status(200).json({
      message: "Doubling processed successfully",
      result: resultAmount,
      card: {
        number: card,
        suit: suits[suitIndex].name,
        icon: cardSuit,
      },
      winStatus: winStatus,
    });
  } catch (error) {
    console.error("Error processing doubling:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint to retrieve user info
app.get("/api/user-info", verifyToken, async (req, res) => {
  const userId = req.user.uid;

  try {
    // retrieve user data from firestore
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    const userData = userDoc.data();

    res.status(200).json(userData);
  } catch (error) {
    console.error("Error retrieving user information:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

exports.api = functions.https.onRequest(app);
