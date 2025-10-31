import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Button,
  Platform,
  PermissionsAndroid,
  ListRenderItem,
} from 'react-native';
// Import from 'react-native-safe-area-context'
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  BleManager,
  Device,
  BleError,
  State,
} from 'react-native-ble-plx';

// Create a new BLE manager instance
const manager = new BleManager();

const App: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 31) {
          // For Android 12 and above
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]);
          if (
            granted['android.permission.BLUETOOTH_CONNECT'] ===
              PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.BLUETOOTH_SCAN'] ===
              PermissionsAndroid.RESULTS.GRANTED
          ) {
            console.log('Bluetooth permissions for Android 12+ granted');
            return true;
          } else {
            console.log('Bluetooth permissions for Android 12+ denied');
            return false;
          }
        } else {
          // For Android 11 and below
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message:
                'This app needs access to your location for Bluetooth scanning.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Location permission granted');
            return true;
          } else {
            console.log('Location permission denied');
            return false;
          }
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // For iOS
  };

  const startScan = async (): Promise<void> => {
    const permissionsGranted = await requestBluetoothPermissions();
    if (!permissionsGranted) {
      console.log('Permissions not granted. Cannot scan.');
      return;
    }

    const state = await manager.state();
    if (state !== State.PoweredOn) {
      alert('Please turn on Bluetooth to scan for devices.');
      return;
    }

    console.log('Scanning...');
    setIsScanning(true);
    setDevices([]);

    manager.startDeviceScan(
      null,
      null,
      (error: BleError | null, device: Device | null) => {
        if (error) {
          console.error(error);
          setIsScanning(false);
          return;
        }

        if (device && device.name) {
          setDevices(prevDevices => {
            if (!prevDevices.find(d => d.id === device.id)) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      },
    );

    setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      console.log('Scan stopped.');
    }, 5000);
  };

  const connectToDevice = (device: Device): void => {
    console.log('Connecting to', device.name);
    manager.stopDeviceScan();
    setIsScanning(false);

    // Connection logic would go here
    alert(`Connecting to ${device.name}`);
  };

  const renderItem: ListRenderItem<Device> = ({item}) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}>
      <Text style={styles.deviceName}>{item.name}</Text>
      <Text style={styles.deviceId}>{item.id}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Bluetooth Scanner</Text>
        <Button
          title={isScanning ? 'Scanning...' : 'Scan'}
          onPress={startScan}
          disabled={isScanning}
        />
      </View>
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>No devices found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 10,
  },
  deviceItem: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  deviceId: {
    fontSize: 12,
    color: 'gray',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
});

export default App;