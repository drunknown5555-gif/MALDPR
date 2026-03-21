import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  AppState,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ADDED: shared storage for cross-device chat
import { db, firebase } from './firebase';

const STORAGE_KEY_PREFIX = 'ALERT_CHAT_';
const getChatKey = (roomId) => `${STORAGE_KEY_PREFIX}${String(roomId || '')}`;

const AlertChat = ({ navigation, route, username }) => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const alertId = route?.params?.alertId ?? '';
  const alertTitle = route?.params?.title ?? 'Alert chat';

  const accountUsername = String(username || '').trim();
  const chatRoomId = String(alertId || alertTitle || 'GLOBAL').trim();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const listRef = useRef(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [footerHeight, setFooterHeight] = useState(0);
  const [inputBarHeight, setInputBarHeight] = useState(0);

  const messagesRef = useRef([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      // iOS: compute real overlap (keeps input close to keyboard)
      if (Platform.OS === 'ios') {
        const screenY = e?.endCoordinates?.screenY;
        const screenH = Dimensions.get('screen').height;

        if (typeof screenY === 'number' && typeof screenH === 'number') {
          const overlap = Math.max(0, screenH - screenY);
          setKeyboardHeight(overlap);
          setKeyboardVisible(true);
          return;
        }
      }

      // Android (UNCHANGED)
      const h = e?.endCoordinates?.height;
      setKeyboardHeight(typeof h === 'number' ? h : 0);
      setKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    });

    return () => {
      try {
        showSub && showSub.remove && showSub.remove();
        hideSub && hideSub.remove && hideSub.remove();
      } catch (e) {}
    };
  }, []);

  const getChatCollection = (roomId) => {
    const safeId = String(roomId || 'GLOBAL');
    return db.collection('alert_chats').doc(safeId).collection('messages');
  };

  const toMillis = (ts) => {
    if (typeof ts === 'number') return ts;
    if (ts && typeof ts === 'object') {
      if (typeof ts.toMillis === 'function') return ts.toMillis();
      if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    }
    return 0;
  };

  const formatHHMM = (tsAny) => {
    const ms = toMillis(tsAny);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const scrollToLatest = (animated) => {
    requestAnimationFrame(() => {
      try {
        if (listRef.current) listRef.current.scrollToEnd({ animated });
      } catch (e) {}
    });
  };

  const loadMessages = async () => {
    try {
      const raw = await AsyncStorage.getItem(getChatKey(chatRoomId));
      if (!raw) {
        setMessages([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setMessages([]);
        return;
      }

      const sorted = [...parsed].sort(
        (a, b) =>
          (toMillis(a?.clientTs || a?.ts) || 0) -
          (toMillis(b?.clientTs || b?.ts) || 0)
      );
      setMessages(sorted);
      scrollToLatest(false);
    } catch (e) {
      setMessages([]);
    }
  };

  const saveMessages = async (next) => {
    try {
      await AsyncStorage.setItem(getChatKey(chatRoomId), JSON.stringify(next));
    } catch (e) {}
  };

  useEffect(() => {
    loadMessages();
  }, [chatRoomId]);

  // realtime Firestore listener
  useEffect(() => {
    let unsub = null;

    try {
      unsub = getChatCollection(chatRoomId)
        .orderBy('clientTs', 'asc')
        .onSnapshot(
          (snap) => {
            const next = [];
            snap.forEach((doc) => {
              const data = doc.data() || {};
              next.push({
                id: doc.id,
                ...data,
              });
            });

            next.sort(
              (a, b) =>
                (toMillis(a?.clientTs || a?.ts) || 0) -
                (toMillis(b?.clientTs || b?.ts) || 0)
            );

            setMessages(next);
            saveMessages(next);
            scrollToLatest(false);
            setErrorMsg('');
          },
          (err) => {
            setErrorMsg(
              `Chat sync failed: ${String(err?.message || err || '')}`
            );
          }
        );
    } catch (e) {
      setErrorMsg(`Chat sync failed: ${String(e?.message || e || '')}`);
    }

    return () => {
      try {
        unsub && unsub();
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomId]);

  useEffect(() => {
    const handler = (state) => {
      if (state === 'background' || state === 'inactive') {
        saveMessages(messagesRef.current);
      }
    };

    let sub;
    try {
      sub = AppState.addEventListener('change', handler);
    } catch (e) {
      try {
        AppState.addEventListener('change', handler);
      } catch (e2) {}
    }

    return () => {
      try {
        sub && sub.remove && sub.remove();
      } catch (e) {
        try {
          AppState.removeEventListener('change', handler);
        } catch (e2) {}
      }
      saveMessages(messagesRef.current);
    };
  }, [chatRoomId]);

  const onSend = async () => {
    setErrorMsg('');

    const trimmed = String(input || '').trim();
    if (!trimmed) return;

    if (!accountUsername) {
      setErrorMsg(
        'Username not loaded. (Pass username from App.js to AlertChat)'
      );
      return;
    }

    const clientTs = Date.now();
    const msgId = `m-${clientTs}-${Math.random().toString(16).slice(2)}`;

    const localMsg = {
      id: msgId,
      sender: accountUsername,
      text: trimmed,
      clientTs,
      ts: clientTs,
    };

    const next = [...messagesRef.current, localMsg];
    setMessages(next);
    setInput('');
    await saveMessages(next);
    scrollToLatest(true);

    try {
      await getChatCollection(chatRoomId).doc(msgId).set({
        sender: accountUsername,
        text: trimmed,
        clientTs,
        ts: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      setErrorMsg(`Send failed: ${String(e?.message || e || '')}`);
    }
  };

  const renderItem = ({ item }) => {
    const sender = String(item?.sender || '');
    const text = String(item?.text || '');
    const timeText = formatHHMM(item?.ts || item?.clientTs);

    const isMe = sender && sender === accountUsername;

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <View style={styles.metaBlock}>
            <Text
              style={[
                styles.msgSender,
                isMe ? styles.msgSenderMe : styles.msgSenderOther,
              ]}
              numberOfLines={1}>
              {sender}
            </Text>

            <Text
              style={[
                styles.msgTime,
                isMe ? styles.msgTimeMe : styles.msgTimeOther,
              ]}>
              {timeText}
            </Text>
          </View>

          <Text
            style={[
              styles.msgText,
              isMe ? styles.msgTextMe : styles.msgTextOther,
            ]}>
            {text}
          </Text>
        </View>
      </View>
    );
  };

  // ANDROID (UNCHANGED)
  const bottomGap = footerHeight + keyboardHeight;

  // iOS: input sits on keyboard when open, otherwise above footer
  const iosBottom = keyboardVisible ? keyboardHeight : footerHeight;

  // iOS FIX: prevent list from rendering into the space under the input
  // This ensures NO message bubble/text can appear in the gap area.
  const iosListMarginBottom = inputBarHeight + iosBottom;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {alertTitle}
        </Text>
      </View>

      <ImageBackground
        source={require('./assets/alertbg.jpg')}
        style={{ flex: 1, position: 'relative' }}
        resizeMode="cover">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={undefined} keyboardVerticalOffset={0}>
          <View style={styles.chatArea}>
            {messages.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No messages yet.</Text>
              </View>
            ) : null}

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              // iOS FIX ONLY: shrink the visible list area so it cannot draw under the input
              style={Platform.OS === 'ios' ? { flex: 1, marginBottom: iosListMarginBottom } : null}
              contentContainerStyle={[
                styles.listContent,
                {
                  // Android unchanged
                  paddingBottom: Platform.OS === 'ios' ? 12 : 12 + inputBarHeight + bottomGap,
                },
              ]}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollToLatest(false)}
              onLayout={() => scrollToLatest(false)}
            />

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </View>

          <View
            style={[
              styles.inputBar,
              Platform.OS === 'ios'
                ? {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: iosBottom,
                  }
                : { marginBottom: bottomGap }, // ANDROID UNCHANGED
            ]}
            onLayout={(e) => {
              const h = e?.nativeEvent?.layout?.height;
              if (typeof h === 'number' && h >= 0) setInputBarHeight(h);
            }}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={onSend} activeOpacity={0.85}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* FOOTER (unchanged, ANDROID unaffected) */}
        <View
          style={styles.bottomFooter}
          onLayout={(e) => {
            const h = e?.nativeEvent?.layout?.height;
            if (typeof h === 'number' && h >= 0) setFooterHeight(h);
          }}>
          <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="home-outline" size={22} color="#9CA3AF" />
            <Text style={styles.footerText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => navigation.navigate('InfoGuideHome')}>
            <Ionicons name="information-circle-outline" size={22} color="#9CA3AF" />
            <Text style={styles.footerText}>Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => navigation.navigate('AlertHome')}>
            <Ionicons name="warning-outline" size={22} color="#2563EB" />
            <Text style={styles.footerTextActive}>Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Status')}>
            <Ionicons name="stats-chart-outline" size={22} color="#9CA3AF" />
            <Text style={styles.footerText}>Status</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    paddingTop: 44,
    borderBottomWidth: 1,
    backgroundColor: '#2563eb',
  },

  backButton: { paddingRight: 12 },

  headerTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold', flex: 1 },

  chatArea: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },

  listContent: { paddingBottom: 12 },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },

  emptyText: { fontSize: 13, color: '#6B7280' },

  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    textAlign: 'center',
    marginTop: 10,
  },

  msgRow: { marginBottom: 10, maxWidth: '88%' },
  msgRowLeft: { alignSelf: 'flex-start' },
  msgRowRight: { alignSelf: 'flex-end' },

  bubble: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  bubbleOther: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
  bubbleMe: { backgroundColor: '#2563EB', borderColor: '#2563EB' },

  metaBlock: { marginBottom: 6 },

  msgSender: { fontSize: 12, fontWeight: '800' },
  msgSenderOther: { color: '#111827' },
  msgSenderMe: { color: '#FFFFFF' },

  msgTime: { fontSize: 11, marginTop: 2 },
  msgTimeOther: { color: '#6B7280' },
  msgTimeMe: { color: '#E5E7EB' },

  msgText: { fontSize: 13, lineHeight: 18 },
  msgTextOther: { color: '#111827' },
  msgTextMe: { color: '#FFFFFF' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 0,
  },

  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  sendBtn: {
    marginLeft: 10,
    height: 42,
    width: 42,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  footerItem: { alignItems: 'center', justifyContent: 'center' },
  footerText: { fontSize: 12, marginTop: 4, color: '#9CA3AF' },
  footerTextActive: {
    fontSize: 12,
    marginTop: 4,
    color: '#2563EB',
    fontWeight: '600',
  },
});

export default AlertChat;