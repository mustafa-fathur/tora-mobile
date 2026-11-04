import { Redirect } from 'expo-router';

// Never shown: the + in the bottom bar opens /add instead. The file exists because
// every tab needs a route. If you somehow land here, go to quick Add.
export default function NewTab() {
  return <Redirect href="/add" />;
}
