import React, { useContext, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import * as Progress from 'react-native-progress';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';

import CheckListHome from './checkListHome';
import CheckList from './checkList';
import QuizHome from './quizHome';
import Quiz from './quiz';
import InfoGuideHome from './infoGuideHome';
import AlertHome from './alertHome';
import Status from './status';
import LogIn from './logIn';
import CreateAccount from './createAccount';


import { auth, db, firebase } from './firebase';

const Stack = createStackNavigator();

export const ExpContext = React.createContext(null);

export const useExp = () => {
  const ctx = useContext(ExpContext);
  if (!ctx) throw new Error('useExp must be used inside ExpContext.Provider');
  return ctx;
};

// max rank is gold
export const MAX_RANK = 9;

// rank images
export const RANK_IMAGES = {
  starter: require('./assets/abysmald.jpg'),
  bronze: require('./assets/kek.jpg'),
  silver: require('./assets/kek.jpg'),
  gold: require('./assets/kek.jpg'),
};

export const getRankTierKey = (rank) => {
  if (rank >= 9) return 'gold';
  if (rank >= 6) return 'silver';
  if (rank >= 3) return 'bronze';
  return 'starter';
};

const USER_PROGRESS_CACHE = {};

const ExpProvider = ({ children, user }) => {
  const [expProgress, setExpProgress] = useState(0);
  const [rank, setRank] = useState(1);
  const [loaded, setLoaded] = useState(false);

  // load user content from Firestore/cache
  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoaded(false);

      if (!user) {
        if (!alive) return;
        setExpProgress(0);
        setRank(1);
        setLoaded(true);
        return;
      }

      // instant restore from cache to prevents resetafter logout/login)
      const cached = USER_PROGRESS_CACHE[user.uid];
      if (cached && alive) {
        setExpProgress(typeof cached.expProgress === 'number' ? cached.expProgress : 0);
        setRank(typeof cached.rank === 'number' ? cached.rank : 1);
      }

      try {
        const ref = db.collection('users').doc(user.uid);
        const snap = await ref.get();

        if (!alive) return;

        if (snap.exists) {
          const data = snap.data() || {};
          const savedExp = typeof data.expProgress === 'number' ? data.expProgress : 0;
          const savedRank = typeof data.rank === 'number' ? data.rank : 1;

          setExpProgress(savedExp);
          setRank(savedRank);

          USER_PROGRESS_CACHE[user.uid] = { expProgress: savedExp, rank: savedRank };
        } else {
          await ref.set({
            expProgress: 0,
            rank: 1,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });

          if (!alive) return;
          setExpProgress(0);
          setRank(1);

          USER_PROGRESS_CACHE[user.uid] = { expProgress: 0, rank: 1 };
        }
      } catch (e) {
        if (!alive) return;
      } finally {
        if (!alive) return;
        setLoaded(true);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [user]);

  // save user content whenever it changes
  useEffect(() => {
    if (!user) return;
    if (!loaded) return;

    USER_PROGRESS_CACHE[user.uid] = { expProgress, rank };

    const save = async () => {
      try {
        await db.collection('users').doc(user.uid).update({
          expProgress,
          rank,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {

      }
    };

    save();
  }, [user, loaded, expProgress, rank]);


  // full points => 10% (0.10) / score 0 or lesser => +1% (0.01) / anything else not full & not <=0 => +5% (0.05)
  const addExpFromQuiz = ({ totalScore, maxScore }) => {
    const gain =
      totalScore >= maxScore ? 1 : totalScore <= 0 ? 0.01 : 0.05;

    if (rank >= MAX_RANK) {
      setExpProgress(1);
      return;
    }

    setExpProgress((prev) => {
      const next = prev + gain;

      if (next >= 1) {
        setRank((r) => {
          const nextRank = r + 1;
          return nextRank >= MAX_RANK ? MAX_RANK : nextRank;
        });

        if (rank + 1 >= MAX_RANK) {
          return 1;
        }

        return 0;
      }

      return next;
    });
  };

  const value = useMemo(
    () => ({ expProgress, rank, addExpFromQuiz }),
    [expProgress, rank]
  );

  return <ExpContext.Provider value={value}>{children}</ExpContext.Provider>;
};

const HomeScreen = ({ navigation, username }) => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const { expProgress, rank } = useExp();

  const isMaxRank = rank >= MAX_RANK;

  const remainExpPercent = isMaxRank
    ? 0
    : Math.max(0, Math.round((1 - expProgress) * 100));

  const displayProgress = isMaxRank ? 1 : expProgress;

  const tierKey = getRankTierKey(rank);
  const rankImgSource = RANK_IMAGES[tierKey];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PrepPointer Home</Text>
        <Text style={styles.headerSubtitle}>Awareness. Action. Recovery.</Text>
      </View>

      <Text style={styles.sectionTitle}>user status</Text>

      <TouchableOpacity
        style={styles.statusBox}
        onPress={() => navigation.navigate('Status')}
      >
        <Text style={styles.welcome}>
          welcome {username ? username : ''}
        </Text>

        <Text style={styles.exp}>
          Rank {rank}
          {isMaxRank ? ' (max)' : ''} • {remainExpPercent}% exp left
        </Text>

        <View style={styles.statusRow}>
          <Image source={rankImgSource} style={styles.rankImage} />

          <Progress.Bar
            progress={displayProgress}
            width={150}
            height={12}
            color="#7e57ff"
            unfilledColor="#d5cfff"
            borderWidth={0}
            borderRadius={8}
          />
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>information & alert</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('InfoGuideHome')}
      >
        <Text style={styles.buttonText}>Info guides</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('AlertHome')}
      >
        <Text style={styles.buttonText}>Alerts</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Dashboard</Text>

      <View style={styles.doubleRow}>
        <TouchableOpacity
          style={styles.squareButton}
          onPress={() => navigation.navigate('QuizHome')}
        >
          <Text style={styles.buttonText}>Quiz</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.squareButton}
          onPress={() => navigation.navigate('CheckListHome')}
        >
          <Text style={styles.buttonText}>Check list</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomFooter}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={22} color="#2563EB" />
          <Text style={styles.footerTextActive}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('InfoGuideHome')}
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#9CA3AF"
          />
          <Text style={styles.footerText}>Info</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('AlertHome')}
        >
          <Ionicons name="alert-circle-outline" size={22} color="#9CA3AF" />
          <Text style={styles.footerText}>Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('Status')}
        >
          <Ionicons name="stats-chart-outline" size={22} color="#9CA3AF" />
          <Text style={styles.footerText}>Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const usernameRef = useRef('');
  usernameRef.current = username;

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);

      if (!u) {
        setUsername('');
        return;
      }

      try {
        const ref = db.collection('users').doc(u.uid);
        const snap = await ref.get();

        if (snap.exists) {
          const data = snap.data() || {};
          const remoteName = typeof data.username === 'string' ? data.username : '';

          // only overwrite if Firestore actually has a name
          if (remoteName) setUsername(remoteName);
        } else {
          // only create doc if missing; do not blank username
          await ref.set({
            username: usernameRef.current || '',
            expProgress: 0,
            rank: 1,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (e) {
        // keep username from login input if firestore fails
      }
    });

    return () => unsub();
  }, []);

  return (
    <ExpProvider user={user}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <>
              <Stack.Screen name="LogIn">
                {(props) => <LogIn {...props} setUsername={setUsername} />}
              </Stack.Screen>
              <Stack.Screen name="CreateAccount" component={CreateAccount} />
            </>
          ) : (
            <>
              <Stack.Screen name="Home">
                {(props) => <HomeScreen {...props} username={username} />}
              </Stack.Screen>

              <Stack.Screen name="CheckListHome" component={CheckListHome} />
              <Stack.Screen name="CheckList" component={CheckList} />
              <Stack.Screen name="QuizHome" component={QuizHome} />
              <Stack.Screen name="Quiz" component={Quiz} />
              <Stack.Screen name="Status" component={Status} />
              <Stack.Screen name="InfoGuideHome" component={InfoGuideHome} />
              <Stack.Screen name="AlertHome" component={AlertHome} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ExpProvider>
  );
}

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

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#020617',
    padding: 10,
  },

  statusBox: {
    backgroundColor: '#F1F5F9',
    padding: 20,
    borderRadius: 10,
    margin: 10,
  },

  welcome: {
    fontSize: 18,
    fontWeight: '500',
    color: '#0F172A',
  },

  exp: {
    marginBottom: 10,
    color: '#64748B',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rankImage: {
    width: 60,
    height: 60,
    marginRight: 15,
    resizeMode: 'contain',
  },

  button: {
    backgroundColor: '#e9e9e9',
    paddingVertical: 15,
    borderRadius: 8,
    marginVertical: 6,
    alignItems: 'center',
    margin: 10,
  },

  buttonText: {
    fontSize: 16,
  },

  doubleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginLeft: 10,
    marginRight: 10,
  },

  squareButton: {
    backgroundColor: '#e9e9e9',
    width: '48%',
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: 'center',
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

  footerItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerText: {
    fontSize: 12,
    marginTop: 4,
    color: '#9CA3AF',
  },

  footerTextActive: {
    fontSize: 12,
    marginTop: 4,
    color: '#2563EB',
    fontWeight: '600',
  },
});