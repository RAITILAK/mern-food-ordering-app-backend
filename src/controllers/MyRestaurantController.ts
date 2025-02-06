// import Restaurant from "../models/restaurant";
// import { Request, Response } from "express";
// import mongoose from "mongoose";
// import cloudinary from "cloudinary";
// import { ObjectId } from "mongodb";

// const getMyRestaurant = async (req: Request, res: Response) => {
//   try {
//     console.log("User ID:", req.userId); // Debugging
//     const userId = new ObjectId(req.userId);

//     const restaurant = await Restaurant.findOne({ user: req.userId });
//     console.log("Restaurant:", restaurant); // Debugging
//     if (!restaurant) {
//       return res.status(404).json({ message: "restaurant not found" });
//     }
//     res.json(restaurant);
//   } catch (error) {
//     console.log("error", error);
//     res.status(500).json({ message: "Error fetching restaurant" });
//   }
// };

// const createMyRestaurant = async (req: Request, res: Response) => {
//   try {
//     console.log("📌 Incoming request to create restaurant");

//     // Debugging: Log request body and file
//     console.log("Request Body:", req.body);
//     console.log("User ID:", req.userId);
//     console.log("Uploaded File:", req.file);

//     // Ensure the image file is uploaded
//     if (!req.file) {
//       console.error("⚠️ No file uploaded");
//       return res.status(400).json({ message: "Restaurant image is required" });
//     }

//     // Parse menuItems if it's a JSON string
//     if (typeof req.body.menuItems === "string") {
//       try {
//         req.body.menuItems = JSON.parse(req.body.menuItems);
//       } catch (error) {
//         console.error("⚠️ Invalid menuItems format:", error);
//         return res.status(400).json({ message: "Invalid menuItems format" });
//       }
//     }

//     // Validate menuItems
//     if (!Array.isArray(req.body.menuItems)) {
//       return res.status(400).json({ message: "menuItems must be an array" });
//     }

//     for (const item of req.body.menuItems) {
//       if (!item.name || !item.price) {
//         return res
//           .status(400)
//           .json({ message: "Each menu item must have a name and price" });
//       }
//     }

//     // Check if the user already has a restaurant
//     const existingRestaurant = await Restaurant.findOne({ user: req.userId });
//     if (existingRestaurant) {
//       return res
//         .status(409)
//         .json({ message: "User restaurant already exists" });
//     }

//     // Upload image to Cloudinary
//     console.log("⏳ Uploading image to Cloudinary...");
//     const base64Image = Buffer.from(req.file.buffer).toString("base64");
//     const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;

//     const uploadResponse = await cloudinary.v2.uploader.upload(dataURI);
//     console.log("✅ Cloudinary Upload Successful:", uploadResponse.url);

//     // Create and save the restaurant
//     const restaurant = new Restaurant({
//       ...req.body,
//       imageUrl: uploadResponse.url,
//       user: new mongoose.Types.ObjectId(req.userId),
//       lastUpdated: new Date(),
//     });

//     await restaurant.save();
//     console.log("✅ Restaurant created successfully:", restaurant);

//     res.status(201).send(restaurant);
//   } catch (error) {
//     console.error("❌ Unexpected Server Error:", error);
//     res.status(500).json({ message: "Something went wrong!" });
//   }
// };

// const updateMyRestaurant = async (req: Request, res: Response) => {
//   try {
//     const restaurant = await Restaurant.findOne({
//       user: req.userId,
//     });

//     if (!restaurant) {
//       return res.status(404).json({ message: "restaurant not found!" });
//     }

//     restaurant.restaurantName = req.body.restaurantName;
//     restaurant.city = req.body.city;
//     restaurant.country = req.body.country;
//     restaurant.deliveryPrice = req.body.deliveryPrice;
//     restaurant.estimatedDeliveryTime = req.body.estimatedDeliveryTime;
//     restaurant.cuisines = req.body.cuisines;
//     restaurant.menuItems = req.body.menuItems;
//     restaurant.lastUpdated = new Date();

//     if(req.file){

//     }

//   } catch (error) {
//     console.log("Error", error);
//     res.status(500).json({ message: "Unable to update restaurant!" });
//   }
// };
// export default {
//   createMyRestaurant,
//   getMyRestaurant,
// };

import Restaurant from "../models/restaurant";
import { Request, Response } from "express";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import { ObjectId } from "mongodb";

const getMyRestaurant = async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.userId);
    const restaurant = await Restaurant.findOne({ user: req.userId });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: "Error fetching restaurant" });
  }
};

const createMyRestaurant = async (req: Request, res: Response) => {
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

    // const base64Image = Buffer.from(req.file.buffer).toString("base64");
    // const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;
    // const uploadResponse = await cloudinary.v2.uploader.upload(dataURI);

    const imageUrl = await uploadImage(req.file as Express.Multer.File);

    const restaurant = new Restaurant({
      ...req.body,
      imageUrl: imageUrl,
      user: new mongoose.Types.ObjectId(req.userId),
      lastUpdated: new Date(),
    });

    await restaurant.save();
    res.status(201).send(restaurant);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong!" });
  }
};

const updateMyRestaurant = async (req: Request, res: Response) => {
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
};
