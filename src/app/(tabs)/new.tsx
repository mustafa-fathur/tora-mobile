import { Redirect } from 'expo-router';

// Never shown: the "+" tab button opens /add instead. The file exists because
// every tab needs a route. If you somehow land here, go to the add screen.
export default function NewTab() {
  return <Redirect href="/add" />;
}
