# libantjs

`libantjs` is a Node.js implementation of the ANT protocol for communicating with ANT USB sticks. It provides a host interface, channel configuration, and ANT message handling.

## Requirements

- Node.js 22 or newer (use a currently maintained Node.js release).
- A supported ANT USB stick. The library currently recognizes the ANT USB-2 Stick and ANT USB-m Stick.
- A working USB environment (`usb@3`, prebuilt native binaries; no libusb needed). Linux, macOS, and Windows are intended targets; the project does not currently run a platform CI matrix.
- On Linux, the user running the application must have permission to access the stick. Configure USB permissions (for example, with a udev rule) rather than running the application as root.

## Installation

Install the package and its native USB dependency in your application:

```sh
npm install libantjs
```

Connect the ANT USB stick before initializing the host. On Linux, confirm that your user has permission to access it.

## Quick start

This example opens a wildcard receive channel on the public ANT network and prints received broadcast payloads:

```js
import Host from 'libantjs';

const host = new Host();
host.on('error', (error) => {
  console.error('ANT/USB error:', error);
});
const channel = host.channel[0];

async function main() {
  const devices = await host.refreshDevices();

  if (devices.length === 0) {
    throw new Error('No supported ANT USB stick found');
  }

  await host.init(0);

  channel.on('data', (message) => {
    console.log('Received:', Array.from(message.payload));
  });

  await channel.assign(channel.BIDIRECTIONAL_SLAVE, 0);
  await channel.setId(0, 0, 0);
  await channel.open();
}

main().catch((error) => {
  console.error('Unable to start ANT host:', error);
});
```

`refreshDevices()` enumerates the supported sticks detected by USB (`getDevices()` returns the list from the last enumeration); the example initializes the first one at index `0`. All host and channel commands return promises that resolve with the response message and reject on transmit errors. Received broadcast messages are emitted on the channel's `data` event, with the eight-byte payload available as `message.payload`. Register listeners before opening the channel.

The example listens on the public ANT network. ANT+ devices use a different network key; configure it with `await channel.setNetworkKey(channel.NET.KEY['ANT+'])` before opening the channel. Close an open channel with `await channel.close()` and shut down the USB host with `await host.exit()`.

To configure a receive-only ANT+ sensor channel, use the sensor helper. It sets ANT+ network and device parameters, enables extended channel ID metadata, and opens the channel. The channel continues to emit the original raw `data` messages, so applications can parse payloads themselves:

```js
host.channel[0].on('data', (message) => {
  console.log('ANT+ HRM payload:', Array.from(message.payload));
});

try {
  await host.connectANTPlusSensor(0, 'hrm', { deviceNumber: 0 });
} catch (error) {
  console.error('Unable to search for HRM sensors:', error);
}
```

Supported sensor types are `'hrm'` and `'tempe'` (or `'environment'`). Set `deviceNumber` to `0` to search for any matching sensor; `net` optionally selects the ANT network number. The helper returns a promise for the configured channel; register `data` listeners on `host.channel[n]` before calling it to receive every message. Existing manual channel setup remains supported.

USB and endpoint runtime failures are forwarded as the host's `error` event; register an error listener before calling `init()`, as in the example.

ANT-FS files downloaded from a device (and upload backups) are saved to `<dataDir>/<device serial number>/`. Each downloaded directory is also saved as a readable `directory-<device serial number>.txt` listing in that folder, replacing the previous listing. Set `dataDir` in the `Host` options, e.g. `new Host({ dataDir: '/path/to/dir' })`; the default is `$XDG_DATA_HOME/libantjs` (`~/.local/share/libantjs`).

Connect an ANT-FS client using a named options object:

```js
const antfsChannel = await host.connectANTFS(0, {
  net: 0,
  deviceNumber: 123456,
  hostname: 'my-antfs-host',
  download: true,
  erase: false,
  ls: false,
  skipNewFiles: false
});
```

`connectANTFS` resolves once the host channel is open and searching for the client. The former positional `connectANTFS` arguments remain supported for compatibility.

## Checks

Run the automated unit tests with:

```sh
npm test
```

The tests use Node.js's built-in test runner and do not require an ANT USB stick.

Run ESLint across the JavaScript source with:

```sh
npm run lint
```

Unused variables are reported as warnings for now. Retained ANT+ profile code
is included in the lint run.

## Message support

#### Message support matrix

| Class  | Type                                 | Supported |
| -----  |--------------------------------------| :-----:|
| Config | Unassign channel                     | Y |
| Config | Assign channel                       | Y |
| Config | Channel ID                           | Y |
| Config | Channel Period                       | Y |
| Config | Search Timeout                       | Y |
| Config | Channel RF frequency                 | Y |
| Config | Set Network Key                      | Y |
| Config | Transmit Power                       | Y |
| Config | Search Waveform                      | Y |
| Config | Add Channel ID to List               | Y |
| Config | Add Encryption ID to List            | N |
| Config | Config ID List                       | Y |
| Config | Config Encryption ID List            | N |
| Config | Set Channel Transmit Power           | Y |
| Config | Low Priority Search Timeout          | Y |
| Config | Serial Number Set Channel ID         | Y |
| Config | Enable Ext RX Messages               | Y |
| Config | Enable LED                           | Y |
| Config | Crystal Enable                       | Y |
| Config | Lib Config                           | Y |
| Config | Frequency Agility                    | Y |
| Config | Proximity Search                     | Y |
| Config | Configure Event Buffer               | Y |
| Config | Channel Search Priority              | Y |
| Config | Set 128-bit Network Key              | Y |
| Config | High Duty Search                     | Y |
| Config | Configure Advanced Burst             | Y |
| Config | Configure Event Filter               | N |
| Config | Configure Selective Data Updates     | N |
| Config | Set Selective Data Update (SDU) Mask | N |
| Config | Configure User NVM                   | N |
| Config | Enable Single Channel Encryption     | N |
| Config | Set Encryption Key                   | N |
| Config | Set Encryption Info                  | N |
| Config | Channel Search Sharing               | Y |
| Config | Load/Store Encryption Key            | N |
| Config | Set USB Descriptor String            | Y |
| Notifications | Start-up Message              | Y |
| Notifications | Serial Error Message          | Y |
| Control | Reset System                        | Y |
| Control | Open Channel                        | Y |
| Control | Close Channel                       | Y |
| Control | Request Message                     | Y |
| Control | Open RX Scan Mode                   | Y |
| Control | Sleep                               | Y |
| Data | Broadcast Data                         | Y |
| Data | Acknowledged Data                      | Y |
| Data | Burst Transfer Data                    | Y |
| Data | Advanced Burst Data                    | Y |
| Channel | Channel Event                       | Y |
| Channel | Channel Response                    | Y |
| Requested response | Channel Status           | Y |
| Requested response | Channel ID               | Y |
| Requested response | ANT Version              | Y |
| Requested response | Capabilities             | Y |
| Requested response | Serial Number                          | Y |
| Requested response | Event Buffer Configuration             | Y |
| Requested response | Advanced Burst Capabilities            | Y |
| Requested response | Advanced Burst Current Configuration   | Y |
| Requested response | Event Filter                           | N |
| Requested response | Selective Data Update Mask Setting     | N |
| Requested response | User NVM                               | N |
| Requested response | Encryption Mode Parameters             | N |
| Test Mode | CW Init                                         | Y |
| Test Mode | CW Test                                         | Y |
| Extended Data (legacy) | Extended Broadcast Data            | N |
| Extended Data (legacy) | Extended Acknowledged Data         | N |
| Extended Data (legacy) | Extended Burst Data                | Y |

The Sleep Message is supported only by specific ANT devices. Extended Burst
Data uses the legacy format intended for AT3 devices; use Advanced Burst Data
for the newer burst format where supported.
