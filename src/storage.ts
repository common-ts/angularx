import {AlertService} from './alert';
import {CurrencyService} from './currency';
import {Locale, LocaleService} from './locale';
import {Privilege, sortPrivileges, toMap} from './Privilege';
import {ResourceService} from './resource';
import {UIService} from './ui';
import {UserAccount} from './UserAccount';

export interface LoadingService {
  showLoading(firstTime?: boolean): void;
  hideLoading(): void;
}

export interface ToastService {
  showToast(msg: string): void;
}

export class DefaultResourceService implements ResourceService {
  constructor() {
    this.resource = this.resource.bind(this);
    this.value = this.value.bind(this);
    this.format = this.format.bind(this);
  }
  resource(): any {
    return storage.getResource();
  }
  value(key: string, param?: any): string {
    const resource = this.resource();
    if (typeof resource !== 'undefined') {
      const str = resource[key];
      if (!str || str.length === 0) {
        return str;
      }
      if (!param) {
        return str;
      } else {
        if (typeof param === 'string') {
          let paramValue = resource[param];
          if (!paramValue) {
            paramValue = param;
          }
          return this.format(str, paramValue);
        }
      }
    } else {
      return '';
    }
  }
  format(...args: any[]): string {
    let formatted = args[0];
    if (!formatted || formatted === '') {
      return '';
    }
    if (args.length > 1 && Array.isArray(args[1])) {
      const params = args[1];
      for (let i = 0; i < params.length; i++) {
        const regexp = new RegExp('\\{' + i + '\\}', 'gi');
        formatted = formatted.replace(regexp, params[i]);
      }
    } else {
      for (let i = 1; i < args.length; i++) {
        const regexp = new RegExp('\\{' + (i - 1) + '\\}', 'gi');
        formatted = formatted.replace(regexp, args[i]);
      }
    }
    return formatted;
  }
}

// tslint:disable-next-line:class-name
export class storage {
  static redirectUrl = location.origin + '/index.html?redirect=oauth2';
  static authentication = 'authentication';
  static home = 'home';
  static moment = false;
  static autoSearch = true;

  private static _user: UserAccount = null;
  private static _forms: Privilege[] = null;
  private static _privileges: Map<string, Privilege> = new Map<string, Privilege>();
  private static _resources = null;
  private static _alertService: AlertService = null;
  private static _loadingService: LoadingService = null;
  private static _toastService: ToastService = null;
  private static _localeService: LocaleService = null;
  private static _currencyService: CurrencyService = null;
  private static _resourceService: ResourceService = new DefaultResourceService();
  private static _uiService: UIService = null;
  static _sessionStorageAllowed = true;
  private static _initModel: any;

  static getRedirectUrl() {
    return encodeURIComponent(storage.redirectUrl);
  }

  static setForms(forms: Privilege[]) {
    let f2 = forms;
    storage._privileges.clear();
    if (forms) {
      f2 = sortPrivileges(forms);
      toMap(storage._privileges, f2);
    }
    storage._forms = f2;
    if (storage._sessionStorageAllowed === true) {
      try {
        if (forms != null) {
          sessionStorage.setItem('forms', JSON.stringify(forms));
        } else {
          sessionStorage.removeItem('forms');
        }
      } catch (err) {
        storage._sessionStorageAllowed = false;
      }
    }
  }
  static privileges(): Map<string, Privilege> {
    return storage._privileges;
  }
  static forms(): Privilege[] {
    let forms = storage._forms;
    if (!forms) {
      if (storage._sessionStorageAllowed === true) {
        try {
          const rawForms = sessionStorage.getItem('forms');
          if (rawForms) {
            storage._forms = JSON.parse(rawForms);
            forms = storage._forms;
          }
        } catch (err) {
          storage._sessionStorageAllowed = false;
        }
      }
    }
    if (forms) {
      return forms;
    } else {
      return [];
    }
  }

  static setUser(user: UserAccount) {
    storage._user = user;
    if (user && user.privileges && Array.isArray(user.privileges)) {
      user.privileges = sortPrivileges(user.privileges);
    }
    if (storage._sessionStorageAllowed === true) {
      try {
        if (user != null) {
          sessionStorage.setItem('authService', JSON.stringify(user));
        } else {
          sessionStorage.removeItem('authService');
        }
      } catch (err) {
        storage._sessionStorageAllowed = false;
      }
    }
  }
  static getUser(): UserAccount {
    let user = storage._user;
    if (!user) {
      if (storage._sessionStorageAllowed === true) {
        try {
          const authService = sessionStorage.getItem('authService');
          if (authService) {
            storage._user = JSON.parse(authService);
            user = storage._user;
          }
        } catch (err) {
          storage._sessionStorageAllowed = false;
        }
      }
    }
    return user;
  }
  static getUserId(): string {
    const user = storage.getUser();
    if (!user) {
      return '';
    } else {
      return user.userId;
    }
  }
  static getUserName(): string {
    const user = storage.getUser();
    if (!user) {
      return '';
    } else {
      return user.username;
    }
  }
  static getToken(): string {
    const user = storage.getUser();
    if (!user) {
      return null;
    } else {
      return user.token;
    }
  }
  static getUserType(): string {
    const user = storage.getUser();
    if (!user) {
      return null;
    } else {
      return user.userType;
    }
  }
  static getDateFormat(): string {
    const user = storage.getUser();
    const localeService = storage.locale();
    if (user) {
      if (user.dateFormat) {
        const x = user.dateFormat;
        return (storage.moment ? x.toUpperCase() : x);
      } else if (user.language) {
        const locale = localeService.getLocaleOrDefault(user.language);
        const x = locale.dateFormat;
        return (storage.moment ? x.toUpperCase() : x);
      } else {
        const language = storage.getBrowserLanguage();
        const locale = localeService.getLocaleOrDefault(language);
        const x = locale.dateFormat;
        return (storage.moment ? x.toUpperCase() : x);
      }
    } else {
      const language = storage.getBrowserLanguage();
      const locale = localeService.getLocaleOrDefault(language);
      const x = locale.dateFormat;
      return (storage.moment ? x.toUpperCase() : x);
    }
  }
  static getLanguage(): string {
    const user = storage.getUser();
    if (user && user.language) {
      return user.language;
    } else {
      return storage.getBrowserLanguage();
    }
  }
  static getBrowserLanguage(): string {
    const browserLanguage = navigator.languages && navigator.languages[0] // Chrome / Firefox
      || navigator.language   // All
      // @ts-ignore
      || navigator.userLanguage; // IE <= 10
    return browserLanguage;
  }

  static getLocale(): Locale {
    const localeService = storage.locale();
    return localeService.getLocaleOrDefault(storage.getLanguage());
  }
  static locale(): LocaleService {
    return storage._localeService;
  }
  static setLocaleService(localeService: LocaleService): void  {
    storage._localeService = localeService;
  }

  static currency(): CurrencyService {
    return storage._currencyService;
  }

  static setCurrencyService(currencyService: CurrencyService): void  {
    storage._currencyService = currencyService;
  }

  static alert(): AlertService {
    return storage._alertService;
  }

  static setAlertService(alertService: AlertService): void  {
    storage._alertService = alertService;
  }

  static loading(): LoadingService {
    return storage._loadingService;
  }

  static setLoadingService(loadingService: LoadingService): void  {
    storage._loadingService = loadingService;
  }

  static toast(): ToastService {
    return storage._toastService;
  }

  static setToastService(toastService: ToastService): void  {
    storage._toastService = toastService;
  }

  static ui(): UIService {
    return storage._uiService;
  }

  static setUIService(uiService: UIService): void  {
    storage._uiService = uiService;
  }

  static getResources(): any {
    return storage._resources;
  }

  static setResources(resources: any): void  {
    storage._resources = resources;
  }

  static resource(): ResourceService {
    return storage._resourceService;
  }

  static getResource(): any {
    const resources = storage._resources;
    const resource = resources[storage.getLanguage()];
    return (resource ? resource : resources['en']);
  }

  static getResourceByLocale(locale: string): any {
    return storage._resources[locale];
  }

  static setResource(locale: string, overrideResources?: any, lastResources?: any): void {
    const overrideResourceCopy = Object.assign({}, overrideResources);
    const updateStaticResources = Object.keys(storage._resources).reduce(
      (accumulator, currentValue) => {
        accumulator[currentValue] = {
          ...storage._resources[currentValue],
          ...overrideResourceCopy[currentValue],
          ...lastResources[currentValue]
        };
        return accumulator;
      }, {});

    const originResources = Object.keys(lastResources).reduce(
      (accumulator, currentValue) => {
        if (accumulator[currentValue]) {
            accumulator[currentValue] = {
            ...overrideResources[currentValue],
            ...lastResources[currentValue]
          };
          return accumulator;
        }
        return { ...accumulator, [currentValue]: lastResources[currentValue]};
      }, overrideResourceCopy);

    const updateResources = {
      ...originResources,
      ...updateStaticResources
    };
    storage._resources[locale] = updateResources[locale];
  }

  static setInitModel(init: any): void {
    storage._initModel = init;
  }
  static getInitModel(): any {
    return storage._initModel;
  }
}