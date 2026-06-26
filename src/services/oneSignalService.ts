import { User } from '@/types';
import { LogLevel, OneSignal } from 'react-native-onesignal';

const ONESIGNAL_APP_ID = 'cc9b57c0-35b6-417b-a183-fccb74ac5b28'; 

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
  }
};

const registerListeners = () => {
  OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event:any) => {});

  OneSignal.Notifications.addEventListener('click', (event:any) => {});
};