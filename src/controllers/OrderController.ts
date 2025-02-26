import { Request, Response } from "express";
import Stripe from "stripe";
import Restaurant, { MenuItemType } from "../models/restaurant";
import Order from "../models/order";

if (!process.env.STRIPE_API_KEY) {
  throw new Error("Stripe API key is missing in environment variables.");
}
const STRIPE = new Stripe(process.env.STRIPE_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL as string;
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

type CheckoutSessionRequest = {
  cartItems: {
    menuItemId: string;
    name: string;
    quantity: string;
  }[];
  deliveryDetails: {
    email: string;
    name: string;
    addressLine1: string;
    city: string;
  };
  restaurantId: string;
};

const stripeWebhookHandler = async (req: Request, res: Response) => {
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig as string,
      STRIPE_ENDPOINT_SECRET
    );
  } catch (error: any) {
    console.log(error);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const order = await Order.findById(event.data.object.metadata?.orderId);

    if (!order) {
      return res.status(404).json({ message: "order not found" });
    }

    order.totalAmount = event.data.object.amount_total;
    order.status = "paid";

    await order.save();
  }
  res.status(200).send();
};

const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const CheckoutSessionRequest: CheckoutSessionRequest = req.body;

    if (!CheckoutSessionRequest.restaurantId) {
      throw new Error("Restaurant ID is required");
    }

    const restaurant = await Restaurant.findById(
      CheckoutSessionRequest.restaurantId
    );

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const newOrder = new Order({
      restaurant: restaurant,
      user: req.userId,
      status: "placed",
      deliveryDetails: CheckoutSessionRequest.deliveryDetails,
      cartItems: CheckoutSessionRequest.cartItems,
      createdAt: new Date(),
    });

    const lineItems = createLineItems(
      CheckoutSessionRequest,
      restaurant.menuItems
    );

    const session = await createSession(
      lineItems,
      newOrder._id.toString(),
      restaurant.deliveryPrice,
      restaurant._id.toString()
    );

    if (!session.url) {
      throw new Error("Error creating Stripe session");
    }

    await newOrder.save();

    res.json({ url: session.url });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: error.message || "An unknown error occurred" });
  }
};

const createLineItems = (
  CheckoutSessionRequest: CheckoutSessionRequest,
  menuItems: MenuItemType[]
) => {
  const lineItems = CheckoutSessionRequest.cartItems
    .map((cartItem) => {
      const menuItem = menuItems.find(
        (item) => item._id.toString() === cartItem.menuItemId?.toString()
      );

      if (!menuItem) {
        return null;
      }

      const unitAmount =
        menuItem.price >= 100 ? menuItem.price : menuItem.price * 100;

      return {
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: menuItem.name,
          },
        },
        quantity: parseInt(cartItem.quantity, 10),
      };
    })
    .filter(
      (item) => item !== null
    ) as Stripe.Checkout.SessionCreateParams.LineItem[];

  return lineItems;
};

const createSession = async (
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  orderId: string,
  deliveryPrice: number,
  restaurantId: string
) => {
  try {
    if (!lineItems.length) {
      throw new Error("Stripe Error: lineItems cannot be empty.");
    }
    if (!orderId || !restaurantId) {
      throw new Error("Stripe Error: Missing orderId or restaurantId.");
    }

    const deliveryAmount =
      deliveryPrice >= 100 ? deliveryPrice : deliveryPrice * 100;

    const sessionData = await STRIPE.checkout.sessions.create({
      line_items: lineItems,
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "Delivery",
            type: "fixed_amount",
            fixed_amount: {
              amount: deliveryAmount,
              currency: "usd",
            },
          },
        },
      ],
      mode: "payment",
      metadata: {
        orderId,
        restaurantId,
      },
      success_url: `${FRONTEND_URL}/order-status?success=true`,
      cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
    });

    return sessionData;
  } catch (error: any) {
    throw new Error(`Stripe error: ${error.message}`);
  }
};

export default {
  createCheckoutSession,
  stripeWebhookHandler,
};
