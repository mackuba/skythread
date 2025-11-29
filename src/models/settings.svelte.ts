interface SettingsData {
  dateLocale?: string;
  incognito?: boolean;
  biohazard?: boolean;
}

class Settings {
  data: SettingsData;

  constructor() {
    let savedData = localStorage.getItem('settings');
    this.data = $state(savedData ? JSON.parse(savedData) : {});
  }

  save() {
    localStorage.setItem('settings', JSON.stringify(this.data));
  }

  logOut() {
    delete this.data.incognito;
    this.save();
  }

  get dateLocale(): string | undefined {
    return this.data.dateLocale;
  }

  set dateLocale(value: string) {
    this.data.dateLocale = value;
    this.save();
  }

  get incognitoMode(): boolean | undefined {
    return this.data.incognito;
  }

  set incognitoMode(value: boolean) {
    this.data.incognito = value;
    this.save();
  }

  get biohazardsEnabled(): boolean | undefined {
    return this.data.biohazard;
  }

  set biohazardsEnabled(value: boolean) {
    this.data.biohazard = value;
    this.save();
  }
}

export const settings = new Settings();
