export const MESSAGES = {
  common: {
    goBackToHomePage: 'Go back to home page',
    edit: 'Edit',
    save: 'Save',
    delete: 'Delete',
    select: 'Select',
  },
  scheme: {
    loading: 'Loading scheme data. Please wait...',
    notFound: 'Scheme data not found',
    loaded: 'Scheme data loaded',
  },
  connection: {
    closed: 'Connection closed',
    connecting: 'Connecting to the server...',
    connected: 'Connected to the server',
    error: 'Connection error',
    processing: 'Processing...',
  },
  device: {
    triggerDialogLabel: 'Devices',
    dialogHeader: 'Connected devices',
    urlInputPlaceholder: 'IP or URL (e.g. 192.168.1.100)',
    labelInputPlaceholder: 'Device label',
    leds: 'leds',
    colors: 'colors',
    noDevicesFound: 'No devices found',
    scanForDevices: 'Scan for devices',
    scanning: 'Scanning...',
  },
  editor: {
    choseColor: 'Choose a color',
  },
} as const;
