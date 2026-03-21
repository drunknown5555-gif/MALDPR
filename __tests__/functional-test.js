import React from 'react';
import { Alert, Linking } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// Silence noisy SafeAreaView deprecation warning
const originalWarn = console.warn;
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((msg, ...rest) => {
    const text = String(msg || '');
    if (text.includes('SafeAreaView has been deprecated')) return;
    originalWarn(msg, ...rest);
  });

  if (!global.requestAnimationFrame) {
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  }
  if (!global.cancelAnimationFrame) {
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  }
});
afterAll(() => {
  console.warn.mockRestore?.();
});

// Asset mocks
jest.mock('../assets/abysmald.jpg', () => 'abysmald-mock', { virtual: true });
jest.mock('../assets/kek.jpg', () => 'kek-mock', { virtual: true });
jest.mock('../assets/snack-icon.png', () => 'snack-icon-mock', { virtual: true });

// AsyncStorage mock
jest.mock(
  '@react-native-async-storage/async-storage',
  () => {
    const store = new Map();

    return {
      __esModule: true,
      default: {
        getItem: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
        setItem: jest.fn(async (key, value) => {
          store.set(key, value);
        }),
        removeItem: jest.fn(async (key) => {
          store.delete(key);
        }),
        clear: jest.fn(async () => {
          store.clear();
        }),
        __reset: () => {
          store.clear();
        },
      },
    };
  },
  { virtual: true }
);

// Basic env mocks
jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(() => Promise.resolve()),
  OrientationLock: { PORTRAIT: 'PORTRAIT' },
}),{ virtual: true });

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }) => <Text>{String(name)}</Text>,
  };
},{ virtual: true });

// WebView mock
jest.mock(
  'react-native-webview',
  () => {
    const React = require('react');
    const { View, Text } = require('react-native');

    const WebView = ({ testID }) => (
      <View testID={testID || 'mock-webview'}>
        <Text>📍</Text>
      </View>
    );

    return { WebView };
  },
  { virtual: true }
);

// Progress bar mock
jest.mock('react-native-progress', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Bar: ({ progress }) => (
      <View
        testID="exp-progress-bar"
        accessibilityValue={{ now: progress, min: 0, max: 1 }}
      />
    ),
  };
},{ virtual: true });

let mockRouteParams = {};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetParams = jest.fn();
const mockReplace = jest.fn();

const mockNavigationObj = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setParams: mockSetParams,
  replace: mockReplace,
};

jest.mock(
  '@react-navigation/native',
  () => {
    const React = require('react');

    return {
      NavigationContainer: ({ children }) => children,
      useNavigation: () => mockNavigationObj,
      useRoute: () => ({ params: mockRouteParams }),
      useFocusEffect: (effect) => {
        React.useEffect(() => {
          try {
            const cleanup = effect?.();
            return typeof cleanup === 'function' ? cleanup : undefined;
          } catch (e) {
            return undefined;
          }
        }, [effect]);
      },
    };
  },
  { virtual: true }
);

jest.mock(
  '@react-navigation/stack',
  () => ({
    createStackNavigator: () => {
      const React = require('react');
      const Stack = {};
      Stack.Navigator = ({ children }) => <>{children}</>;
      Stack.Screen = ({ children, component: Component }) => {
        const nav = mockNavigationObj;

        if (typeof children === 'function') return children({ navigation: nav });
        if (Component) return <Component navigation={nav} />;

        return null;
      };
      return Stack;
    },
  }),
  { virtual: true }
);

const mockIsAllChecklistCompleted = jest.fn(() => false);
const mockIsAllQuizzesCompleted = jest.fn(() => false);
const mockIsAllQuizzesPerfect = jest.fn(() => false);

jest.mock('../checkListHome', () => ({
  __esModule: true,
  default: () => null,
  CHECKLIST_OPTIONS: ['Disaster 1', 'Disaster 2', 'Disaster 3', 'Disaster 4'],
  isAllChecklistCompleted: (...args) => mockIsAllChecklistCompleted(...args),
}));

jest.mock('../checkList', () => () => null);

jest.mock('../quizHome', () => ({
  __esModule: true,
  default: () => null,
  isAllQuizzesCompleted: (...args) => mockIsAllQuizzesCompleted(...args),
  isAllQuizzesPerfect: (...args) => mockIsAllQuizzesPerfect(...args),
}));

jest.mock('../quiz', () => () => null);
jest.mock('../infoGuideHome', () => () => null);
jest.mock('../alertHome', () => () => null);
jest.mock('../status', () => () => null);
jest.mock('../logIn', () => () => null);
jest.mock('../createAccount', () => () => null);

jest.mock('../firebase', () => {
  let authCallback = null;
  const userStore = new Map();
  let currentUser = null;

  const alertChatRooms = new Map();
  const roomListeners = new Map();

  const getRoomMap = (roomId) => {
    const safeRoomId = String(roomId || 'GLOBAL');
    if (!alertChatRooms.has(safeRoomId)) {
      alertChatRooms.set(safeRoomId, new Map());
    }
    return alertChatRooms.get(safeRoomId);
  };

  const getRoomListeners = (roomId) => {
    const safeRoomId = String(roomId || 'GLOBAL');
    if (!roomListeners.has(safeRoomId)) {
      roomListeners.set(safeRoomId, new Set());
    }
    return roomListeners.get(safeRoomId);
  };

  const buildSnapshot = (roomId) => {
    const room = getRoomMap(roomId);
    const docs = Array.from(room.entries())
      .map(([id, data]) => ({
        id,
        data: () => data,
      }))
      .sort(
        (a, b) =>
          (a.data()?.clientTs || a.data()?.ts || 0) -
          (b.data()?.clientTs || b.data()?.ts || 0)
      );

    return {
      forEach: (cb) => {
        docs.forEach((doc) => cb(doc));
      },
    };
  };

  const emitRoomSnapshot = (roomId) => {
    const listeners = Array.from(getRoomListeners(roomId));
    const snap = buildSnapshot(roomId);
    listeners.forEach((cb) => cb(snap));
  };

  const makeMessagesCollection = (roomId) => ({
    orderBy: () => ({
      onSnapshot: (successCb, errorCb) => {
        try {
          const listeners = getRoomListeners(roomId);
          listeners.add(successCb);
          successCb(buildSnapshot(roomId));
          return () => {
            listeners.delete(successCb);
          };
        } catch (err) {
          if (typeof errorCb === 'function') errorCb(err);
          return () => {};
        }
      },
    }),
    doc: (msgId) => ({
      set: async (data) => {
        const room = getRoomMap(roomId);
        room.set(String(msgId), { ...(data || {}) });
        emitRoomSnapshot(roomId);
      },
    }),
  });

  const db = {
    collection: (name) => {
      if (name === 'users') {
        return {
          doc: (uid) => ({
            get: async () => {
              const data = userStore.get(uid);
              return { exists: !!data, data: () => data };
            },
            set: async (data, options) => {
              const merge = !!options?.merge;
              if (merge) {
                userStore.set(uid, { ...(userStore.get(uid) || {}), ...(data || {}) });
              } else {
                userStore.set(uid, { ...(data || {}) });
              }
            },
            update: async (data) => {
              userStore.set(uid, { ...(userStore.get(uid) || {}), ...(data || {}) });
            },
          }),
        };
      }

      if (name === 'alert_chats') {
        return {
          doc: (roomId) => ({
            collection: (subName) => {
              if (subName !== 'messages') {
                throw new Error(`Unexpected subcollection: ${subName}`);
              }
              return makeMessagesCollection(roomId);
            },
          }),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  };

  const auth = {
    get currentUser() {
      return currentUser;
    },
    set currentUser(u) {
      currentUser = u;
    },
    onAuthStateChanged: (cb) => {
      authCallback = cb;
      return () => {
        authCallback = null;
      };
    },
    signOut: jest.fn(() => Promise.resolve()),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
  };

  const firebase = {
    firestore: {
      FieldValue: {
        serverTimestamp: () => 'SERVER_TIMESTAMP',
      },
    },
  };

  const __mock = {
    reset: () => {
      userStore.clear();
      alertChatRooms.clear();
      roomListeners.clear();
      authCallback = null;
      currentUser = null;

      auth.signOut.mockClear();
      auth.signInWithEmailAndPassword.mockClear();
      auth.createUserWithEmailAndPassword.mockClear();
    },
    seedUserDoc: (uid, data) => {
      userStore.set(uid, data);
    },
    getUserDoc: (uid) => userStore.get(uid),
    emitAuthUser: async (userOrNull) => {
      currentUser = userOrNull;
      if (typeof authCallback === 'function') {
        await authCallback(userOrNull);
      }
    },
    setCurrentUser: (u) => {
      currentUser = u;
    },
    pushChatMessage: async (roomId, msg) => {
      const room = getRoomMap(roomId);
      const safeMsg = { ...(msg || {}) };
      const msgId =
        safeMsg.id ||
        `m-${safeMsg.clientTs || safeMsg.ts || Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`;

      room.set(String(msgId), {
        sender: String(safeMsg.sender || ''),
        text: String(safeMsg.text || ''),
        clientTs:
          typeof safeMsg.clientTs === 'number'
            ? safeMsg.clientTs
            : typeof safeMsg.ts === 'number'
            ? safeMsg.ts
            : Date.now(),
        ts:
          typeof safeMsg.ts === 'number'
            ? safeMsg.ts
            : typeof safeMsg.clientTs === 'number'
            ? safeMsg.clientTs
            : Date.now(),
      });

      emitRoomSnapshot(roomId);
    },
  };

  return { auth, db, firebase, __mock };
});

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { __mock: firebaseMock } = require('../firebase');
const { auth } = require('../firebase');
const App = require('../App').default;
const CheckList = jest.requireActual('../checkList').default;
const CheckListHome = jest.requireActual('../checkListHome').default;
const Quiz = jest.requireActual('../quiz').default;
const QuizHome = jest.requireActual('../quizHome').default;
const Status = jest.requireActual('../status').default;
const InfoGuideHome = jest.requireActual('../infoGuideHome').default;
const AlertHome = jest.requireActual('../alertHome').default;
const AlertChat = jest.requireActual('../alertChat').default;
const LogIn = jest.requireActual('../logIn').default;
const CreateAccount = jest.requireActual('../createAccount').default;

const { ExpContext } = require('../App');

const flushMicrotasks = async (rounds = 1) => {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {});
    await Promise.resolve();
  }
};

describe('Functional tests', () => {
  beforeEach(() => {
    firebaseMock.reset();
    AsyncStorage.__reset?.();
    mockRouteParams = {};
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetParams.mockClear();
    mockReplace.mockClear();
    mockIsAllChecklistCompleted.mockReset();
    mockIsAllQuizzesCompleted.mockReset();
    mockIsAllQuizzesPerfect.mockReset();
    jest.clearAllMocks();
  });

  test('App: renders EXP bar from Firestore expProgress and shows exp left text', async () => {
    const uid = 'user-1';
    firebaseMock.seedUserDoc(uid, {
      username: 'tester',
      expProgress: 0.4,
      rank: 2,
    });

    const screen = render(<App />);

    await act(async () => {
      await firebaseMock.emitAuthUser({ uid });
    });
    await flushMicrotasks();

    const bar = await waitFor(() => screen.getByTestId('exp-progress-bar'));
    expect(bar.props.accessibilityValue.now).toBe(0.4);
    expect(screen.getByText(/Rank 2/i)).toBeTruthy();
    expect(screen.getByText(/60% exp left/i)).toBeTruthy();
    expect(screen.getByText(/welcome tester/i)).toBeTruthy();
  });

  test('App:max rank >= 9 shows progress=1 and exp left 0%', async () => {
    const uid = 'user-2';
    firebaseMock.seedUserDoc(uid, {
      username: 'maxer',
      expProgress: 0.2,
      rank: 9,
    });

    const screen = render(<App />);

    await act(async () => {
      await firebaseMock.emitAuthUser({ uid });
    });
    await flushMicrotasks();

    const bar = await waitFor(() => screen.getByTestId('exp-progress-bar'));
    expect(bar.props.accessibilityValue.now).toBe(1);
    expect(screen.getByText(/Rank 9 \(max\)/i)).toBeTruthy();
    expect(screen.getByText(/0% exp left/i)).toBeTruthy();
  });

  test('CheckListHome + CheckList: error, selection, completed badge, checklist progress + done alert', async () => {
    mockRouteParams = {};
    const home = render(<CheckListHome />);

    fireEvent.press(home.getByText('Confirm selected check list'));
    expect(home.getByText('Please select a check list')).toBeTruthy();

    fireEvent.press(home.getByText('Disaster 2'));
    await flushMicrotasks();
    expect(home.queryByText('Please select a check list')).toBeNull();

    mockRouteParams = { completionUpdate: { key: 'Disaster 2', completed: true } };
    home.rerender(<CheckListHome />);

    await waitFor(() => {
      expect(home.getByText('Completed')).toBeTruthy();
    });

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockRouteParams = { selected: 'Disaster 2' };
    const checklist = render(<CheckList />);

    expect(checklist.getByText('0%')).toBeTruthy();

    fireEvent.press(checklist.getByText('Next'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Incomplete',
      'Please complete this page before continuing.'
    );

    fireEvent.press(checklist.getByText('Select all'));
    await waitFor(() => expect(checklist.getByText('50%')).toBeTruthy());

    fireEvent.press(checklist.getByText('Next'));
    await waitFor(() => expect(checklist.getByText(/\(2\/2\)/)).toBeTruthy());

    fireEvent.press(checklist.getByText('Select all'));
    await waitFor(() => expect(checklist.getByText('100%')).toBeTruthy());

    fireEvent.press(checklist.getByText('Finish'));
    expect(alertSpy).toHaveBeenCalledWith('Done!', 'Disaster 2 checklist completed.');
  });

  test('QuizHome: confirm without selection shows error; selecting an option clears error', async () => {
    firebaseMock.setCurrentUser({ uid: 'u-quiz' });

    mockRouteParams = {};
    const qh = render(<QuizHome />);

    fireEvent.press(qh.getByText('Confirm selected check quiz'));
    expect(qh.getByText('Please select a quiz')).toBeTruthy();

    fireEvent.press(qh.getByText('Quiz 1'));
    await flushMicrotasks();
    expect(qh.queryByText('Please select a quiz')).toBeNull();
  });

  test('Quiz: must select before confirm, confirm updates score, finish triggers quiz finished alert and awards exp', async () => {
    jest.useFakeTimers();

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const mockAddExpFromQuiz = jest.fn();

    mockRouteParams = { selected: 'Quiz 1' };

    const quizScreen = render(
      <ExpContext.Provider value={{ expProgress: 0, rank: 1, addExpFromQuiz: mockAddExpFromQuiz }}>
        <Quiz />
      </ExpContext.Provider>
    );

    expect(quizScreen.getByText(/Q1\/3/i)).toBeTruthy();
    expect(quizScreen.getByText(/Score:\s*0/i)).toBeTruthy();

    fireEvent.press(quizScreen.getByText('Confirm'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Select an option',
      'Please choose an answer before confirming.'
    );

    fireEvent.press(quizScreen.getByText('Stay calm and check official alerts'));
    fireEvent.press(quizScreen.getByText('Confirm'));

    await waitFor(() => {
      expect(quizScreen.getByText('+1 point ✅')).toBeTruthy();
    });

    fireEvent.press(quizScreen.getByText('Next'));
    await waitFor(() => {
      expect(quizScreen.getByText(/Q2\/3/i)).toBeTruthy();
    });

    fireEvent.press(quizScreen.getByText('Candy'));
    fireEvent.press(quizScreen.getByText('Confirm'));

    await waitFor(() => {
      expect(quizScreen.getByText('-1 point ❌')).toBeTruthy();
    });

    fireEvent.press(quizScreen.getByText('Next'));
    await waitFor(() => {
      expect(quizScreen.getByText(/Q3\/3/i)).toBeTruthy();
    });

    fireEvent.press(quizScreen.getByText('999'));
    fireEvent.press(quizScreen.getByText('Confirm'));

    await waitFor(() => {
      expect(quizScreen.getByText('+1 point ✅')).toBeTruthy();
    });

    fireEvent.press(quizScreen.getByText('Finish'));

    expect(alertSpy).toHaveBeenCalledWith('Quiz finished', 'Your score: 1');
    expect(mockAddExpFromQuiz).toHaveBeenCalledWith({ totalScore: 1, maxScore: 3 });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('Status: locked achievements show help-circle; unlocked achievements show no help-circle', async () => {
    mockIsAllChecklistCompleted.mockReturnValue(false);
    mockIsAllQuizzesCompleted.mockReturnValue(false);
    mockIsAllQuizzesPerfect.mockReturnValue(false);

    firebaseMock.setCurrentUser({ uid: 'u-status', email: 'tester@example.com' });

    const locked = render(
      <ExpContext.Provider value={{ expProgress: 0, rank: 1, addExpFromQuiz: jest.fn() }}>
        <Status />
      </ExpContext.Provider>
    );

    expect(locked.getByText('All checklists completed')).toBeTruthy();
    expect(locked.getByText('All quizzes completed')).toBeTruthy();
    expect(locked.getByText('All quizzes full score')).toBeTruthy();
    expect(locked.getByText('Reach Bronze Rank')).toBeTruthy();
    expect(locked.getByText('Reach Silver Rank')).toBeTruthy();
    expect(locked.getByText('Reach Gold Rank')).toBeTruthy();

    expect(locked.queryAllByText('help-circle').length).toBeGreaterThan(0);

    mockIsAllChecklistCompleted.mockReturnValue(true);
    mockIsAllQuizzesCompleted.mockReturnValue(true);
    mockIsAllQuizzesPerfect.mockReturnValue(true);

    const unlocked = render(
      <ExpContext.Provider value={{ expProgress: 1, rank: 9, addExpFromQuiz: jest.fn() }}>
        <Status />
      </ExpContext.Provider>
    );

    expect(unlocked.queryAllByText('help-circle').length).toBe(0);
    expect(unlocked.getByText(/Rank 9 \(max\)/i)).toBeTruthy();
    expect(unlocked.getByText('tester')).toBeTruthy();
  });

  test('InfoGuideHome: shows headlines, filter works, Guide tab shows stage info', async () => {
    const prevApiKey = process.env.EXPO_PUBLIC_PREPARECENTER_API_KEY;
    process.env.EXPO_PUBLIC_PREPARECENTER_API_KEY = 'test-api-key';

    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const u = String(url);

      if (u.includes('gdacsapi/api/events/geteventlist/events4app')) {
        return {
          ok: true,
          json: async () => ({
            features: [
              {
                properties: {
                  eventtype: 'EQ',
                  eventid: '100',
                  name: 'Singapore Earthquake Event',
                  country: 'Singapore',
                  datemodified: '2025-01-02T00:00:00Z',
                  fromdate: '2025-01-01T00:00:00Z',
                  affectedcountries: [{ countryname: 'Singapore', iso3: 'SGP' }],
                },
              },
              {
                properties: {
                  eventtype: 'TC',
                  eventid: '200',
                  name: 'Philippines Cyclone Event',
                  country: 'Philippines',
                  datemodified: '2025-01-03T00:00:00Z',
                  fromdate: '2025-01-03T00:00:00Z',
                  affectedcountries: [{ countryname: 'Philippines', iso3: 'PHL' }],
                },
              },
            ],
          }),
        };
      }

      if (u.includes('gdacsapi/api/emm/getemmnewsbykey')) {
        if (u.includes('eventtype=EQ') && u.includes('eventid=100')) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: 'Earthquake shakes Singapore',
                  link: 'https://example.com/eq',
                  pubDate: '2025-01-05T00:00:00Z',
                  description: 'Singapore reports tremors',
                },
              ],
            }),
          };
        }
        if (u.includes('eventtype=TC') && u.includes('eventid=200')) {
          return {
            ok: true,
            json: async () => ({
              items: [
                {
                  title: 'Cyclone approaches Philippines',
                  link: 'https://example.com/tc',
                  pubDate: '2025-01-06T00:00:00Z',
                  description: 'Philippines prepares for cyclone',
                },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({ items: [] }) };
      }

      if (u.includes('api.preparecenter.org/v1/org/')) {
        if (u.includes('/org/afg/whatnow')) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'g1',
                  countryCode: 'AFG',
                  eventType: 'earthquake',
                  translations: {
                    en: {
                      lang: 'en',
                      title: 'Earthquake preparedness',
                      description: 'Basic steps to prepare.',
                      mitigation: ['Secure heavy furniture'],
                      immediate: ['Drop, Cover, Hold On'],
                      recover: ['Check for injuries'],
                    },
                  },
                },
              ],
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      }

      return { ok: false, json: async () => ({}) };
    });

    const screen = render(<InfoGuideHome />);

    expect(screen.getByText('Information')).toBeTruthy();
    expect(screen.getByText('Guide')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Earthquake shakes Singapore')).toBeTruthy();
      expect(screen.getByText('Cyclone approaches Philippines')).toBeTruthy();
    });

    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Earthquake')).toBeTruthy();
    expect(screen.getByText('Cyclone')).toBeTruthy();

    fireEvent.press(screen.getByText('Earthquake'));
    await waitFor(() => {
      expect(screen.getByText('Earthquake shakes Singapore')).toBeTruthy();
    });
    expect(screen.queryByText('Cyclone approaches Philippines')).toBeNull();

    fireEvent.press(screen.getByText('chevron-forward'));
    await flushMicrotasks();
    expect(screen.queryByText('All')).toBeNull();

    fireEvent.press(screen.getByText('Guide'));
    await waitFor(() => {
      expect(screen.getByText('Earthquake preparedness')).toBeTruthy();
      expect(screen.getByText('Mitigation')).toBeTruthy();
      expect(screen.getByText('Immediate')).toBeTruthy();
      expect(screen.getByText('Recover')).toBeTruthy();
      expect(screen.getByText('• Secure heavy furniture')).toBeTruthy();
      expect(screen.getByText('• Drop, Cover, Hold On')).toBeTruthy();
      expect(screen.getByText('• Check for injuries')).toBeTruthy();
    });

    fetchSpy.mockRestore();
  });

  test('AlertHome: shows current alert + list, expand toggles details/map, refresh refetches', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const u = String(url);

      if (u.includes('gdacsapi/api/events/geteventlist/events4app')) {
        return {
          ok: true,
          json: async () => ({
            features: [
              {
                properties: {
                  eventid: '300',
                  eventtype: 'EQ',
                  episodeid: '1',
                  eventname: 'Japan Earthquake',
                  alertlevel: 'red',
                  country: 'Japan',
                  fromdate: '2025-01-05T00:00:00Z',
                  todate: '2025-01-06T00:00:00Z',
                  severitydata: { severitytext: 'Severe shaking reported' },
                },
                geometry: { type: 'Point', coordinates: [139.6917, 35.6895] },
              },
              {
                properties: {
                  eventid: '100',
                  eventtype: 'TC',
                  episodeid: '1',
                  eventname: 'Singapore Cyclone',
                  alertlevel: 'orange',
                  country: 'Singapore',
                  fromdate: '2025-01-03T00:00:00Z',
                  todate: '2025-01-04T00:00:00Z',
                  severitydata: { severitytext: 'Strong winds' },
                },
                geometry: { type: 'Point', coordinates: [103.8198, 1.3521] },
              },
              {
                properties: {
                  eventid: '999',
                  eventtype: 'FL',
                  episodeid: '1',
                  eventname: 'Brazil Flood',
                  alertlevel: 'green',
                  country: 'Brazil',
                  fromdate: '2025-01-07T00:00:00Z',
                  todate: '2025-01-08T00:00:00Z',
                },
                geometry: { type: 'Point', coordinates: [-47.8825, -15.7942] },
              },
            ],
          }),
        };
      }

      if (u.includes('gdacsapi/api/polygons/getgeometry')) {
        return {
          ok: true,
          json: async () => ({ type: 'FeatureCollection', features: [] }),
        };
      }

      return { ok: false, json: async () => ({}) };
    });

    const screen = render(<AlertHome />);

    expect(screen.getByText('Loading alerts...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Current alert')).toBeTruthy();
      expect(screen.getByText('Japan Earthquake')).toBeTruthy();
      expect(screen.getByText('Alert list')).toBeTruthy();
      expect(screen.getByText('Singapore Cyclone')).toBeTruthy();
    });

    expect(screen.queryByText('Brazil Flood')).toBeNull();

    const downs1 = screen.queryAllByText('chevron-down');
    expect(downs1.length).toBeGreaterThan(0);
    fireEvent.press(downs1[0]);

    await waitFor(() => {
      expect(screen.getAllByText('📍').length).toBeGreaterThan(0);
    });

    const downs2 = screen.queryAllByText('chevron-down');
    if (downs2.length > 0) {
      fireEvent.press(downs2[downs2.length - 1]);
    }

    await waitFor(() => {
      expect(screen.getAllByText(/Alert level:/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Coordinate:/i).length).toBeGreaterThan(0);
    });

    const refreshBtns = screen.getAllByText('refresh');
    fireEvent.press(refreshBtns[0]);

    await waitFor(() => {
      const calls = fetchSpy.mock.calls.map((c) => String(c[0]));
      const eventListCalls = calls.filter((x) =>
        x.includes('gdacsapi/api/events/geteventlist/events4app')
      );
      expect(eventListCalls.length).toBeGreaterThanOrEqual(2);
    });

    fetchSpy.mockRestore();
  });

  test('AlertChat: messages sync between different users in the same alert room', async () => {
    const route = {
      params: {
        alertId: 'room-1',
        title: 'Japan Earthquake',
      },
    };

    const aliceScreen = render(
      <AlertChat navigation={{ ...mockNavigationObj }} route={route} username="alice" />
    );

    const bobScreen = render(
      <AlertChat navigation={{ ...mockNavigationObj }} route={route} username="bob" />
    );

    await waitFor(() => {
      expect(aliceScreen.getByText('No messages yet.')).toBeTruthy();
      expect(bobScreen.getByText('No messages yet.')).toBeTruthy();
    });

    await act(async () => {
      await firebaseMock.pushChatMessage('room-1', {
        id: 'm-1',
        sender: 'alice',
        text: 'hello from alice',
        clientTs: 1000,
        ts: 1000,
      });
    });

    await flushMicrotasks(4);

    await waitFor(() => {
      expect(aliceScreen.getByText('hello from alice')).toBeTruthy();
      expect(bobScreen.getByText('hello from alice')).toBeTruthy();
    });

    await waitFor(() => {
      expect(aliceScreen.getAllByText('alice').length).toBeGreaterThan(0);
      expect(bobScreen.getAllByText('alice').length).toBeGreaterThan(0);
    });

    await act(async () => {
      await firebaseMock.pushChatMessage('room-1', {
        id: 'm-2',
        sender: 'bob',
        text: 'reply from bob',
        clientTs: 2000,
        ts: 2000,
      });
    });

    await flushMicrotasks(4);

    await waitFor(() => {
      expect(aliceScreen.getByText('reply from bob')).toBeTruthy();
      expect(bobScreen.getByText('reply from bob')).toBeTruthy();
    });

    await waitFor(() => {
      expect(aliceScreen.getAllByText('bob').length).toBeGreaterThan(0);
      expect(bobScreen.getAllByText('bob').length).toBeGreaterThan(0);
    });

    expect(aliceScreen.queryByText(/Send failed:/i)).toBeNull();
    expect(bobScreen.queryByText(/Send failed:/i)).toBeNull();
  });

  test('CreateAccount then LogIn using the created account ', async () => {
    const createdUid = 'uid-created';

    auth.createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: createdUid },
    });

    auth.signOut.mockResolvedValueOnce();

    auth.signInWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: createdUid },
    });

    const ca = render(<CreateAccount />);

    fireEvent.changeText(ca.getByPlaceholderText('Enter user name'), 'newuser');
    fireEvent.changeText(ca.getByPlaceholderText('Enter password'), 'pass1234');

    fireEvent.press(ca.getByText('Confirm'));

    await waitFor(() => {
      expect(ca.getByText('Account created. Please log in.')).toBeTruthy();
    });

    const setUsernameSpy = jest.fn();
    const loginNav = { navigate: jest.fn() };

    const li = render(<LogIn navigation={loginNav} setUsername={setUsernameSpy} />);

    fireEvent.changeText(li.getByPlaceholderText('Enter user name'), 'newuser');
    fireEvent.changeText(li.getByPlaceholderText('Enter password'), 'pass1234');

    fireEvent.press(li.getByText('Confirm'));

    await waitFor(() => {
      expect(setUsernameSpy).toHaveBeenCalledWith('newuser');
    });

    expect(auth.createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(auth.signInWithEmailAndPassword).toHaveBeenCalledTimes(1);

    const createdCallEmail = auth.createUserWithEmailAndPassword.mock.calls[0][0];
    const loginCallEmail = auth.signInWithEmailAndPassword.mock.calls[0][0];
    expect(createdCallEmail).toBe('newuser@preppointer.local');
    expect(loginCallEmail).toBe('newuser@preppointer.local');
  });
});