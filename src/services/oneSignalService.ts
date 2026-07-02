import { User } from "@/types";
import { LogLevel, OneSignal } from "react-native-onesignal";
import { ticketsService } from "./tickets";
import { navigate, getCurrentRoute } from "../navigation/navigationService";

const ONESIGNAL_APP_ID = "cc9b57c0-35b6-417b-a183-fccb74ac5b28";

export const NotificationService = {
  initialize: (user: User) => {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.Notifications.requestPermission(true);
    registerListeners();
    OneSignal.login(user.id);
  },
  logoutUser: () => {
    OneSignal.logout();
  },
};

const navigateToTicket = async (ticketId: string) => {
  try {
    const currentRoute = getCurrentRoute();
    if (
      currentRoute?.name === "Chat" &&
      (currentRoute.params as any)?.ticket?.id === ticketId
    ) {
      return;
    }

    const ticket = await ticketsService.getTicketById(ticketId);
    navigate("Chat", { ticket });
  } catch (error) {
    console.error("Erro ao navegar para o ticket via notificação:", error);
  }
};

const registerListeners = () => {
  OneSignal.Notifications.addEventListener(
    "foregroundWillDisplay",
    (event: any) => {},
  );

  OneSignal.Notifications.addEventListener("click", (event: any) => {
    const data = event.notification?.additionalData;
    const ticketId = data?.ticketId;

    if (ticketId) {
      navigateToTicket(ticketId);
    }
  });
};
