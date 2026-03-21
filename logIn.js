import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { auth, db, firebase } from './firebase';

const toLoginEmail = (username) => {
  const u = String(username || '').trim();
  if (!u) return '';
  return u.includes('@') ? u : `${u}@preppointer.local`;
};

const LogIn = ({ navigation, setUsername }) => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const [localUsername, setLocalUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const onConfirm = async () => {
    const cleanUsername = String(localUsername || '').trim();
    const cleanPassword = String(password || '').trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('Please enter username and password');
      return;
    }
    setErrorMsg('');

    const email = toLoginEmail(cleanUsername);

    try {
      const userCred = await auth.signInWithEmailAndPassword(email, cleanPassword);

      // do not block login if Firestore fails
      try {
        await db
          .collection('users')
          .doc(userCred.user.uid)
          .set(
            {
              username: cleanUsername,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      } catch (eSave) {
        // ignore
      }

      if (typeof setUsername === 'function') {
        setUsername(cleanUsername);
      }

    } catch (e) {
      const code = e?.code || '';

      if (code === 'auth/wrong-password') {
        setErrorMsg('Wrong password.');
      } else if (code === 'auth/user-not-found') {
        setErrorMsg('Account not found. Please create an account.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('Invalid username.');
      } else if (code === 'auth/invalid-credential') {
        setErrorMsg('Invalid login.');
      } else {
        setErrorMsg('Login failed.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PrepPointer</Text>
        <Text style={styles.headerSubtitle}>Log in</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>User name</Text>
        <TextInput
          value={localUsername}
          onChangeText={setLocalUsername}
          placeholder="Enter user name"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={onConfirm}>
          <Text style={styles.buttonText}>Confirm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createAccountWrap}
          onPress={() => navigation.navigate('CreateAccount')}
        >
          <Text style={styles.createAccountText}>Create a new account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default LogIn;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    backgroundColor: '#2563eb',
    paddingVertical: 20,
    alignItems: 'center',
    paddingTop: 48,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#BFDBFE',
  },

  form: {
    padding: 16,
    marginTop: 20,
  },

  label: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 12,
    fontWeight: '600',
  },

  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },

  error: {
    marginTop: 12,
    color: '#DC2626',
    fontSize: 13,
  },

  button: {
    backgroundColor: '#e9e9e9',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 18,
    alignItems: 'center',
  },

  buttonText: {
    fontSize: 16,
  },

  createAccountWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  createAccountText: {
    fontSize: 14,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
});

