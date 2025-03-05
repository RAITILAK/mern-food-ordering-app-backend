import { Request, Response } from "express";
import { parse } from "path";
import Restaurant from "../models/restaurant";
import mongoose from "mongoose";

const getRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId;

    // ✅ Validate restaurantId
    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid Restaurant ID" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found!" });
    }

    res.json(restaurant);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const searchRestaurant = async (req: Request, res: Response) => {
  try {
    const city = req.params.city;

    const searchQuery = (req.query.searchQuery as string) || "";
    const selectedCuisines = (req.query.selectedCuisines as string) || "";
    const sortOption = (req.query.sortOption as string) || "lastUpdated";
    const page = parseInt(req.query.page as string) || 1;

    let query: any = {};

    query["city"] = new RegExp(city, "i");
    const cityCheck = await Restaurant.countDocuments(query);
    if (cityCheck === 0) {
      return res.status(404).json({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pages: 1,
        },
      });
    }

    if (selectedCuisines) {
      //  URL = selectedCuisines=italian,burgers,chinese
      //[italian,burgers,chinese]
      const cuisinesArray = selectedCuisines
        .split(",")
        .map((cuisines) => new RegExp(cuisines, "i"));

      query["cuisines"] = { $all: cuisinesArray };
    }

    if (searchQuery) {
      // restaurantName= pizza palce
      //cuisines = [pizza,pasta,italian]
      //searchquery= pasta
      const searchRegex = new RegExp(searchQuery, "i");
      query["$or"] = [
        { RestaurantName: searchRegex },
        { cuisines: { $in: [searchRegex] } },
      ];
    }

    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    // sortOption = "lastUpdated"
    const restaurant = await Restaurant.find(query)
      .sort({ [sortOption]: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await Restaurant.countDocuments(query);

    const response = {
      data: restaurant,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / pageSize), //50 results,pageSize =10 > Pages=5
      },
    };

    res.json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

export default {
  searchRestaurant,
  getRestaurant,
};
