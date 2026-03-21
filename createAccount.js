import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { auth, db, firebase } from './firebase';

const toLoginEmail = (username) => {
  const u = String(username || '').trim();
  if (!u) return '';
  return u.includes('@') ? u : `${u}@preppointer.local`;
};

const CreateAccount = () => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const navigation = useNavigation();

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const onConfirm = async () => {
    const u = String(newUsername || '').trim();
    const p = String(newPassword || ''); 

    if (!u || !p.trim()) {
      setSuccessMsg('');
      setErrorMsg('Please enter username and password');
      return;
    }

    // password rules
    const hasMinLength = p.length >= 8;
    const hasNumber = /\d/.test(p);

    if (!hasMinLength || !hasNumber) {
      setSuccessMsg('');
      setErrorMsg('Password must be at least 8 characters and contain a number');
      return;
    }

    const email = toLoginEmail(u);

    try {
      // create auth account
      await auth.createUserWithEmailAndPassword(email, p);

      try {
        await auth.signOut();
      } catch (eSignOut) {
        // ignore
      }

      try {
        const current = auth?.currentUser;
        if (current?.uid) {
          await db.collection('users').doc(current.uid).set({
            username: u,
            expProgress: 0,
            rank: 1,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (eSave) {
        // ignore
      }

      setErrorMsg('');
      setSuccessMsg('Account created. Please log in.');
      navigation.replace('LogIn');
    } catch (e) {
      const code = e?.code || '';

      if (code === 'auth/email-already-in-use') {
        setSuccessMsg('');
        setErrorMsg('User name is used. Please choose another user name.');
        return;
      }

      if (code === 'auth/weak-password') {
        setSuccessMsg('');
        setErrorMsg('Password too weak (min 6 characters).');
        return;
      }

      if (code === 'auth/invalid-email') {
        setSuccessMsg('');
        setErrorMsg('Invalid username.');
        return;
      }

      setSuccessMsg('');
      setErrorMsg('Failed to save account. Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Create account</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>User name</Text>
        <TextInput
          value={newUsername}
          onChangeText={setNewUsername}
          placeholder="Enter user name"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter password"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={onConfirm}>
          <Text style={styles.buttonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CreateAccount;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    paddingTop: 44,
    borderBottomWidth: 1,
    backgroundColor: '#2563eb',
  },

  backButton: {
    paddingRight: 12,
  },

  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
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

  success: {
    marginTop: 12,
    color: '#16A34A',
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
});
