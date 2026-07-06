import { User } from "@/types";
import { ticketsService } from "./tickets";
import { navigate, getCurrentRoute } from "../navigation/navigationService";

const ONESIGNAL_APP_ID = "cc9b57c0-35b6-417b-a183-fccb74ac5b28";

// Flag para verificar se OneSignal está disponível (módulo nativo)
let isOneSignalAvailable = false;
let OneSignal: any = null;
let LogLevel: any = null;

// Tentar importar OneSignal dinamicamente
try {
  const oneSignalModule = require("react-native-onesignal");
  OneSignal = oneSignalModule.OneSignal;
  LogLevel = oneSignalModule.LogLevel;
  isOneSignalAvailable = true;
} catch (error) {
  console.warn("⚠️ OneSignal não disponível (ambiente de desenvolvimento/simulador)");
  isOneSignalAvailable = false;
}

export const NotificationService = {
  initialize: (user: User) => {
    if (!isOneSignalAvailable || !OneSignal) {
      console.log("📱 OneSignal: Mock mode (simulador/desenvolvimento)");
      return;
    }

    try {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
      OneSignal.initialize(ONESIGNAL_APP_ID);
      OneSignal.Notifications.requestPermission(true);
      registerListeners();
      OneSignal.login(user.id);
    } catch (error) {
      console.warn("⚠️ Erro ao inicializar OneSignal:", error);
    }
  },
  logoutUser: () => {
    if (!isOneSignalAvailable || !OneSignal) {
      return;
    }

    try {
      OneSignal.logout();
    } catch (error) {
      console.warn("⚠️ Erro ao fazer logout do OneSignal:", error);
    }
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
  if (!isOneSignalAvailable || !OneSignal) {
    return;
  }

  try {
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
  } catch (error) {
    console.warn("⚠️ Erro ao registrar listeners do OneSignal:", error);
  }
};
