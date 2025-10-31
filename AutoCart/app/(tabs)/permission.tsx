import React, {useState, useEffect, useCallback} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image, // For the image placeholder
  FlatList,
  TouchableOpacity,
  Linking, // To open settings
  Platform,
  StatusBar,
  ListRenderItem,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  checkMultiple,
  request,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';
  // Permission, // Removed the Permission type import

// Define the shape of our permission item
interface PermissionItem {
  id: string;
  title: string;
  permission: string; // Use string here because the library returns plain string keys at runtime
}

// Map permission string -> result string
type PermissionStatusMap = Record<string, (typeof RESULTS)[keyof typeof RESULTS]>;

// The list of permissions based on your image
// We only use permissions available on Android
const PERMISSION_LIST: PermissionItem[] = [
  {
    id: '1',
    title: 'Bluetooth Connect',
    permission: PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
  },
  {
    id: '2',
    title: 'Bluetooth Scan',
    permission: PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
  },
  {
    id: '3',
    title: 'Access Fine Location',
    permission: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  },
];

// Helper type for our statuses state (defined above)

const App: React.FC = () => {
  // We use Partial<> because initially the map is empty
  const [statuses, setStatuses] = useState<Partial<PermissionStatusMap>>({});

  // Function to check all permissions on load
  const checkPermissions = useCallback(async () => {
    // This screen is only for Android based on the permissions
    if (Platform.OS !== 'android') {
      return;
    }
    const permissionsToCheck = PERMISSION_LIST.map(item => item.permission as any);
    try {
      const currentStatuses = await checkMultiple(permissionsToCheck);
      setStatuses(currentStatuses);
      console.log('Permission statuses:', currentStatuses);
    } catch (err) {
      console.error('Error checking permissions:', err);
    }
  }, []);

  // Run the check when the component first mounts
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Function to handle pressing the "OPEN" button
  const handleRequestPermission = useCallback(async (permission: string) => {
    try {
      // Request the specific permission
  const result = await request(permission as any);
      // Update the state for this specific permission
      setStatuses(prevStatuses => ({
        ...prevStatuses,
  [permission]: result,
      }));
    } catch (err) {
      console.error('Error requesting permission:', err);
    }
  }, []);

  // Render function for each item in the FlatList
  const renderItem: ListRenderItem<PermissionItem> = ({item}) => {
  const status = statuses[item.permission as any];
    const isGranted = status === RESULTS.GRANTED;
    const isBlocked = status === RESULTS.BLOCKED; // Denied permanently

    let buttonText = 'OPEN';
  let onPress = () => { void handleRequestPermission(item.permission); };
    let buttonStyle = styles.buttonOpen;
    let textStyle = styles.buttonTextOpen;

    if (isGranted) {
      buttonText = 'GRANTED';
  onPress = () => {}; // Do nothing if already granted
      buttonStyle = styles.buttonGranted;
      textStyle = styles.buttonTextGranted;
    } else if (isBlocked) {
      buttonText = 'OPEN SETTINGS';
  onPress = () => { void Linking.openSettings(); }; // Open app settings
    }

    return (
      <View style={styles.listItem}>
        <View style={styles.numberCircle}>
          <Text style={styles.numberText}>{item.id}</Text>
        </View>
        <Text style={styles.permissionTitle}>{item.title}</Text>
        <TouchableOpacity
          style={buttonStyle}
          onPress={onPress}
          disabled={isGranted}>
          <Text style={textStyle}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with back arrow (non-functional placeholder) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Permissions</Text>
        <View style={{width: 30}} />{/* Spacer */}
      </View>

      {/* --- YOUR IMAGE PLACEHOLDER --- */}
      <View style={styles.imageContainer}>
        <Image
          // Add your image to an 'assets' folder in your project's root
          // Then uncomment the line below:
          source={require('../../assets/images/permissions.png')}

          // Using a placeholder style until you add your image
          style={styles.image}
        />
      </View>
      {/* ------------------------------- */}

      <FlatList
        data={PERMISSION_LIST}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 16, // Adjust as needed
    backgroundColor: '#007bffc1',
  },
  backButtonText: {
    fontSize: 28,
    color: '#333',
  },
  headerTitle: {
    width: '100%',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111111',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  image: {
    width: '90%',
    height: 300,
    resizeMode: 'contain',
    // Placeholder background color
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  listContainer: {
    paddingHorizontal: 24, // A bit more padding
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 28, // More spacing
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  numberCircle: {
    width: 30, // Slightly larger
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF', // Blue color from image
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  permissionTitle: {
    flex: 1, // Takes up remaining space
    fontSize: 16,
    color: '#333',
    fontWeight: '500', // Bolder
  },
  buttonOpen: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
  },
  buttonTextOpen: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonGranted: {
    backgroundColor: '#e6f7ff', // Light blue
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
  },
  buttonTextGranted: {
    color: '#0056b3', // Darker blue
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default App;