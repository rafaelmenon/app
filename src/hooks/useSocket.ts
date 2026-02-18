import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { API_CONFIG } from "../config/api";

interface UseSocketProps {
  userId?: string;
  companyId?: string;
  showAll?: boolean;
}

export const useSocket = (props: UseSocketProps) => {
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    const { userId, companyId, showAll = false } = props;

    if (!userId || !companyId) {
      return;
    }

    // Conectar ao servidor Socket.IO
    const socketUrl = "https://api-v2.whatsprofissional.com";
    // const socketUrl = "https://aa4b3d6b34b7.ngrok-free.app";

    http: socket.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 45000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      randomizationFactor: 0.5,
      withCredentials: false,
    });

    socket.current.on("connect", () => {
      // Registrar o usuário quando conectar
      socket.current?.emit("register_user", {
        userId,
        companyId,
        showAll,
      });
    });

    socket.current.on("disconnect", () => {
      console.log("🔌 Desconectado do Socket.IO");
    });

    socket.current.on("connect_error", (error) => {
      console.error("❌ Erro na conexão Socket.IO:", error);
    });

    // Cleanup na desmontagem do componente
    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [props.userId, props.companyId, props.showAll]);

  // Função helper para validar se o evento é da empresa do usuário logado
  const isValidCompanyEvent = (eventName: string, data: any): boolean => {
    // Se não há dados ou não há companyId no evento, considerar válido
    if (!data || !data.companyId) {
      return true;
    }

    // Obter companyId do usuário logado
    const userCompanyId = props.companyId;

    // Se não conseguiu obter companyId do usuário, bloquear por segurança
    if (!userCompanyId) {
      console.warn(
        "⚠️ SEGURANÇA: Evento bloqueado - companyId do usuário não encontrado",
        eventName,
      );
      return false;
    }

    // Validar se o companyId do evento corresponde ao do usuário
    const isValid = data.companyId === userCompanyId;

    if (!isValid) {
      console.warn("🚫 SEGURANÇA: Evento bloqueado - companyId diferente!", {
        event: eventName,
        eventCompanyId: data.companyId,
        userCompanyId,
      });
    }

    return isValid;
  };

  // Função para escutar eventos COM validação de companyId
  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socket.current) {
      // Wrapper que valida o companyId antes de chamar o callback
      const wrappedCallback = (...args: any[]) => {
        const data = args[0]; // Primeiro argumento é sempre o data

        // Validar se o evento é da empresa correta
        if (!isValidCompanyEvent(event, data)) {
          return; // Bloquear evento de outra empresa
        }

        // Evento válido, executar callback original
        callback(...args);
      };

      socket.current.on(event, wrappedCallback);
    }
  };

  // Função para parar de escutar eventos
  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socket.current) {
      socket.current.off(event, callback);
    }
  };

  // Função para emitir eventos
  const emit = (event: string, data?: any) => {
    if (socket.current) {
      socket.current.emit(event, data);
    }
  };

  // Função para atualizar o estado showAll no backend
  const updateShowAll = (showAll: boolean) => {
    const { userId } = props;

    if (socket.current && userId) {
      socket.current.emit("update_show_all", {
        userId,
        showAll,
      });
    }
  };

  return {
    socket: socket.current,
    on,
    off,
    emit,
    updateShowAll,
  };
};
