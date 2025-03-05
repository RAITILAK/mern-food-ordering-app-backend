import { RequestHandler, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth"; // ✅ Use AuthenticatedRequest
import User from "../models/user";

const getCurrentUser: RequestHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const currentUser = await User.findById(req.userId);
    if (!currentUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(currentUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * ✅ Create a new user
 */

const createCurrentUser: RequestHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    console.log("Raw request body:", req.body);

    const { auth0Id, email } = req.body as { auth0Id?: string; email?: string };

    console.log("Parsed auth0Id:", auth0Id);
    console.log("Parsed email:", email);

    if (!auth0Id) {
      res.status(400).json({ error: "Auth0 ID is missing" });
      return; // No need to return res.status, just return
    }

    if (!email) {
      res.status(400).json({ error: "Email is missing" });
      return; // No need to return res.status, just return
    }

    const existingUser = await User.findOne({ auth0Id });

    if (existingUser) {
      res.status(200).send();
      return; // No need to return res.status, just return
    }

    const newUser = new User({ auth0Id, email });
    await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Error creating user" });
  }
};

/**
 * ✅ Update current user
 */
const updateCurrentUser: RequestHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    console.log("Request body:", req.body);

    const { name, addressLine1, country, city } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({ message: "User not found!" });
      return;
    }

    user.name = name;
    user.addressLine1 = addressLine1;
    user.city = city;
    user.country = country;

    await user.save();

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
};

export default {
  createCurrentUser,
  updateCurrentUser,
  getCurrentUser,
};
