# libantjs

`libantjs` is a Node.js implementation of the ANT protocol for communicating with ANT USB sticks. It provides a host interface, channel configuration, and ANT message handling.

## Requirements

- Node.js 22 or newer (use a currently maintained Node.js release).
- A supported ANT USB stick. The library currently recognizes the ANT USB-2 Stick and ANT USB-m Stick.
- A working libusb-compatible USB environment. Linux, macOS, and Windows are intended targets; the project does not currently run a platform CI matrix.
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
const Host = require('libantjs');

const host = new Host();
const devices = host.getDevices();

if (devices.length === 0) {
  throw new Error('No supported ANT USB stick found');
}

const channel = host.channel[0];

host.init(0, (error) => {
  if (error) {
    console.error('Unable to initialize ANT host:', error);
    return;
  }

  channel.on('data', (message) => {
    console.log('Received:', Array.from(message.payload));
  });

  channel.assign(channel.BIDIRECTIONAL_SLAVE, 0, (assignError) => {
    if (assignError) {
      console.error('Unable to assign channel:', assignError);
      return;
    }

    channel.setId(0, 0, 0, (idError) => {
      if (idError) {
        console.error('Unable to configure channel ID:', idError);
        return;
      }

      channel.open((openError) => {
        if (openError) {
          console.error('Unable to open channel:', openError);
        }
      });
    });
  });
});
```

`getDevices()` returns the supported sticks detected by USB; the example initializes the first one at index `0`. Host and channel command callbacks receive `(error, response)`. Received broadcast messages are emitted on the channel's `data` event, with the eight-byte payload available as `message.payload`. Register listeners before opening the channel.

The example listens on the public ANT network. ANT+ devices use a different network key; configure it with `channel.setNetworkKey(channel.NET.KEY['ANT+'], callback)` before opening the channel. Close an open channel with `channel.close(callback)` and shut down the USB host with `host.exit(callback)`.

## Tests

Run the automated unit tests with:

```sh
npm test
```

The tests use Node.js's built-in test runner and do not require an ANT USB stick.

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
| Config | Add Channel ID to List               | N |
| Config | Add Encryption ID to List            | N |
| Config | Config ID List                       | N |
| Config | Config Encryption ID List            | N |
| Config | Set Channel Transmit Power           | Y |
| Config | Low Priority Search Timeout          | Y |
| Config | Serial Number Set Channel ID         | N |
| Config | Enable Ext RX Messages               | N |
| Config | Enable LED                           | N |
| Config | Crystal Enable                       | N |
| Config | Lib Config                           | Y |
| Config | Frequency Agility                    | N |
| Config | Proximity Search                     | Y |
| Config | Configure Event Buffer               | Y |
| Config | Channel Search Priority              | N |
| Config | Set 128-bit Network Key              | N |
| Config | High Duty Search                     | N |
| Config | Configure Advanced Burst             | Y |
| Config | Configure Event Filter               | N |
| Config | Configure Selective Data Updates     | N |
| Config | Set Selective Data Update (SDU) Mask | N |
| Config | Configure User NVM                   | N |
| Config | Enable Single Channel Encryption     | N |
| Config | Set Encryption Key                   | N |
| Config | Set Encryption Info                  | N |
| Config | Channel Search Sharing               | N |
| Config | Load/Store Encryption Key            | N |
| Config | Set USB Descriptor String            | N |
| Notifications | Start-up Message              | Y |
| Notifications | Serial Error Message          | Y |
| Control | Reset System                        | Y |
| Control | Open Channel                        | Y |
| Control | Close Channel                       | Y |
| Control | Request Message                     | Y |
| Control | Open RX Scan Mode                   | Y |
| Control | Sleep                               | N |
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
| Test Mode | CW Init                                         | N |
| Test Mode | CW Test                                         | N |
| Extended Data (legacy) | Extended Broadcast Data            | N |
| Extended Data (legacy) | Extended Acknowledged Data         | N |
| Extended Data (legacy) | Extended Burst Data                | N |
