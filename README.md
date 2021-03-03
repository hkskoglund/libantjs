# libantjs

A javascript implementation of the ANT protocol that interfaces with ANT USB stick. For nodejs.

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
| Requested response | Channel Status                         | Y |
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
