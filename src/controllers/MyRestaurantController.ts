import Restaurant from "../models/restaurant";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import Order from "../models/order";

const getMyRestaurant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    console.log("🔍 Received userId:", userId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: No user ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("❌ Invalid ObjectId format:", userId);
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const restaurant = await Restaurant.findOne({
      user: new mongoose.Types.ObjectId(userId),
    });
    console.log("🔍 Restaurant found:", restaurant);

    if (!restaurant) {
      console.error("❌ No restaurant found for user:", userId);
      return res.status(404).json({ error: "Restaurant not found" });
    }

    res.status(200).json(restaurant);
  } catch (error) {
    console.error("🔥 Server error in getMyRestaurant:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const createMyRestaurant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Restaurant image is required" });
    }

    if (typeof req.body.menuItems === "string") {
      try {
        req.body.menuItems = JSON.parse(req.body.menuItems);
      } catch {
        return res.status(400).json({ message: "Invalid menuItems format" });
      }
    }

    if (!Array.isArray(req.body.menuItems)) {
      return res.status(400).json({ message: "menuItems must be an array" });
    }

    for (const item of req.body.menuItems) {
      if (!item.name || !item.price) {
        return res
          .status(400)
          .json({ message: "Each menu item must have a name and price" });
      }
    }

    const existingRestaurant = await Restaurant.findOne({ user: req.userId });
    if (existingRestaurant) {
      return res
        .status(409)
        .json({ message: "User restaurant already exists" });
    }

    const imageUrl = await uploadImage(req.file as Express.Multer.File);

    const restaurant = new Restaurant({
      ...req.body,
      imageUrl: imageUrl,
      user: new mongoose.Types.ObjectId(req.userId), // Corrected to 'user'
      lastUpdated: new Date(),
    });

    await restaurant.save();
    res.status(201).send(restaurant);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong!" });
  }
};

const updateMyRestaurant = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ user: req.userId });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found!" });
    }

    restaurant.restaurantName = req.body.restaurantName;
    restaurant.city = req.body.city;
    restaurant.country = req.body.country;
    restaurant.deliveryPrice = req.body.deliveryPrice;
    restaurant.estimatedDeliveryTime = req.body.estimatedDeliveryTime;
    restaurant.cuisines = req.body.cuisines;
    restaurant.menuItems = req.body.menuItems;
    restaurant.lastUpdated = new Date();

    if (req.file) {
      const imageUrl = await uploadImage(req.file as Express.Multer.File);
      restaurant.imageUrl = imageUrl;
    }

    await restaurant.save();
    res.status(200).send(restaurant);
  } catch (error) {
    res.status(500).json({ message: "Unable to update restaurant!" });
  }
};

const getMyRestaurantOrders = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const restaurant = await Restaurant.findOne({ user: req.userId }); // Corrected to 'user'
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found!" });
    }

    const orders = await Order.find({ restaurant: restaurant._id })
      .populate("restaurant")
      .populate("user");

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "order not found!" });
    }

    const restaurant = await Restaurant.findById(order.restaurant);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Check if restaurant.user exists before accessing _id
    if (restaurant.user && restaurant.user._id.toString() !== req.userId) {
      return res.status(401).send();
    }

    order.status = status;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "unable to update order status" });
  }
};

const uploadImage = async (file: Express.Multer.File) => {
  const base64Image = Buffer.from(file.buffer).toString("base64");
  const dataURI = `data:${file.mimetype};base64,${base64Image}`;

  const uploadResponse = await cloudinary.v2.uploader.upload(dataURI);
  return uploadResponse.url;
};

export default {
  createMyRestaurant,
  getMyRestaurant,
  updateMyRestaurant,
  getMyRestaurantOrders,
  updateOrderStatus,
};
