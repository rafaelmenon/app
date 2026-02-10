# Multiatendimento App

Aplicativo React Native com Expo para o sistema de multiatendimento.

## Tecnologias

- **React Native** - Framework mobile
- **Expo** - Plataforma para desenvolvimento
- **NativeWind** - Tailwind CSS para React Native
- **TypeScript** - Tipagem estática
- **Axios** - Cliente HTTP
- **React Navigation** - Navegação entre telas
- **AsyncStorage** - Persistência de dados local

## Configuração Inicial

1. Instale as dependências:
```bash
npm install
```

2. Configure a URL da API:
   - Edite o arquivo `src/config/api.ts`
   - Altere o `baseURL` conforme seu ambiente:
     - **iOS Simulator**: `http://localhost:3001`
     - **Android Emulador**: `http://10.0.2.2:3001`
     - **Dispositivo Físico**: `http://<SEU_IP>:3001` (ex: `http://192.168.3.7:3001`)

3. Inicie o servidor:
```bash
npm start
```

## Estrutura de Pastas

```
app/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── screens/        # Telas do aplicativo
│   │   ├── LoginScreen.tsx
│   │   └── HomeScreen.tsx
│   ├── navigation/     # Configuração de navegação
│   │   └── AppNavigator.tsx
│   ├── services/       # APIs e serviços externos
│   │   ├── api.ts      # Configuração Axios
│   │   └── auth.ts     # Serviço de autenticação
│   ├── contexts/       # Contextos React
│   │   └── AuthContext.tsx
│   ├── config/         # Configurações do app
│   │   └── api.ts      # URL da API
│   ├── hooks/          # Custom hooks
│   ├── types/          # Definições de tipos TypeScript
│   └── utils/          # Funções utilitárias
├── assets/             # Imagens, fontes, etc
└── App.tsx             # Componente raiz
```

## Scripts

- `npm start` - Inicia o Expo
- `npm run android` - Executa no Android
- `npm run ios` - Executa no iOS
- `npm run web` - Executa na web

## Funcionalidades Implementadas

### Autenticação
- ✅ Tela de login
- ✅ Autenticação com token JWT
- ✅ Persistência de sessão com AsyncStorage
- ✅ Renovação automática de token
- ✅ Proteção de rotas
- ✅ Logout

## Desenvolvimento

O aplicativo usa NativeWind (Tailwind CSS) para estilização, mantendo consistência visual com o frontend web.

Use classes Tailwind diretamente nos componentes:

```tsx
<View className="flex-1 bg-white p-4">
  <Text className="text-lg font-bold">Título</Text>
</View>
```

## Testando no Dispositivo

Para testar no seu dispositivo físico:

1. Instale o aplicativo Expo Go:
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android - Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Descubra o IP da sua máquina:
   - **Windows**: `ipconfig` no CMD
   - **Mac/Linux**: `ifconfig` no Terminal

3. Configure a URL da API em `src/config/api.ts`:
   ```typescript
   export const API_CONFIG = {
     baseURL: 'http://192.168.3.7:3001', // Seu IP aqui
   };
   ```

4. Execute `npm start` e escaneie o QR code com o Expo Go

5. Certifique-se de que o dispositivo está na mesma rede que o computador
