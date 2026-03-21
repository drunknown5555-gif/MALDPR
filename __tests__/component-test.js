import React from 'react';
import { Alert, Linking } from 'react-native';
import { render, fireEvent, act, waitFor, cleanup } from '@testing-library/react-native';

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
}), { virtual: true });

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }) => <Text>{String(name)}</Text>,
  };
}, { virtual: true });

// virtual mock for react-native-webview
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

// Mock progress bar
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

// helpers
const flushMicrotasks = async (rounds = 8) => {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {});
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const waitForMockIdle = async (mockFn, stableRounds = 8, maxRounds = 240) => {
  let previous = -1;
  let stable = 0;

  for (let i = 0; i < maxRounds; i++) {
    await flushMicrotasks(1);
    const current = mockFn.mock.calls.length;

    if (current === previous) {
      stable += 1;
      if (stable >= stableRounds) return;
    } else {
      previous = current;
      stable = 0;
    }
  }
};

afterEach(async () => {
  cleanup();
  await flushMicrotasks(20);

  try {
    if (global.fetch?.mockRestore) {
      global.fetch.mockRestore();
    }
  } catch (e) {}

  jest.useRealTimers();
  jest.clearAllMocks();
});

// Virtual navigation mocks
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
            const cleanupFn = effect?.();
            return typeof cleanupFn === 'function' ? cleanupFn : undefined;
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

jest.mock('../infoGuideHome', () => {
  const actual = jest.requireActual('../infoGuideHome');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
  };
});

jest.mock('../alertHome', () => {
  const actual = jest.requireActual('../alertHome');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
  };
});

jest.mock('../logIn', () => {
  const actual = jest.requireActual('../logIn');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
  };
});

jest.mock('../createAccount', () => {
  const actual = jest.requireActual('../createAccount');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
  };
});

const mockIsAllChecklistCompleted = jest.fn(() => false);
jest.mock('../checkListHome', () => {
  const actual = jest.requireActual('../checkListHome');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    isAllChecklistCompleted: (...args) => mockIsAllChecklistCompleted(...args),
  };
});

const mockIsAllQuizzesCompleted = jest.fn(() => false);
const mockIsAllQuizzesPerfect = jest.fn(() => false);
jest.mock('../quizHome', () => {
  const actual = jest.requireActual('../quizHome');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    isAllQuizzesCompleted: (...args) => mockIsAllQuizzesCompleted(...args),
    isAllQuizzesPerfect: (...args) => mockIsAllQuizzesPerfect(...args),
  };
});

jest.mock('../firebase', () => {
  let authCallback = null;

  const store = new Map();
  const authUsers = new Map();

  let currentUser = null;
  let uidCounter = 1;

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
              const data = store.get(uid);
              return { exists: !!data, data: () => data };
            },
            set: async (data, options) => {
              const merge = !!options?.merge;
              if (merge) store.set(uid, { ...(store.get(uid) || {}), ...(data || {}) });
              else store.set(uid, { ...(data || {}) });
            },
            update: async (data) => {
              store.set(uid, { ...(store.get(uid) || {}), ...(data || {}) });
            },
          }),
        };
      }

      if (name === 'alert_chats') {
        return {
          doc: (roomId) => ({
            collection: (subName) => {
              if (subName !== 'messages') throw new Error(`Unexpected subcollection: ${subName}`);
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

    signOut: jest.fn(async () => {
      currentUser = null;
      if (typeof authCallback === 'function') await authCallback(null);
    }),

    signInWithEmailAndPassword: jest.fn(async (email, password) => {
      const e = String(email || '');
      const p = String(password || '');

      if (!e.includes('@')) {
        const err = new Error('invalid-email');
        err.code = 'auth/invalid-email';
        throw err;
      }

      const rec = authUsers.get(e);
      if (!rec) {
        const err = new Error('user-not-found');
        err.code = 'auth/user-not-found';
        throw err;
      }
      if (rec.password !== p) {
        const err = new Error('wrong-password');
        err.code = 'auth/wrong-password';
        throw err;
      }

      currentUser = { uid: rec.uid, email: e };
      if (typeof authCallback === 'function') await authCallback(currentUser);

      return { user: { uid: rec.uid, email: e } };
    }),

    createUserWithEmailAndPassword: jest.fn(async (email, password) => {
      const e = String(email || '');
      const p = String(password || '');

      if (!e.includes('@')) {
        const err = new Error('invalid-email');
        err.code = 'auth/invalid-email';
        throw err;
      }

      if (authUsers.has(e)) {
        const err = new Error('email-already-in-use');
        err.code = 'auth/email-already-in-use';
        throw err;
      }

      if (p.length < 6) {
        const err = new Error('weak-password');
        err.code = 'auth/weak-password';
        throw err;
      }

      const uid = `uid-${uidCounter++}`;
      authUsers.set(e, { uid, password: p });

      currentUser = { uid, email: e };
      if (typeof authCallback === 'function') await authCallback(currentUser);

      return { user: { uid, email: e } };
    }),
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
      store.clear();
      authUsers.clear();
      alertChatRooms.clear();
      roomListeners.clear();
      authCallback = null;
      currentUser = null;
      uidCounter = 1;
      auth.signOut.mockClear();
      auth.signInWithEmailAndPassword.mockClear();
      auth.createUserWithEmailAndPassword.mockClear();
    },
    seedUserDoc: (uid, data) => {
      store.set(uid, data);
    },
    getUserDoc: (uid) => store.get(uid),
    emitAuthUser: async (userOrNull) => {
      currentUser = userOrNull;
      if (typeof authCallback === 'function') {
        await authCallback(userOrNull);
      }
    },
    setCurrentUser: (u) => {
      currentUser = u;
    },
    seedAuthUser: (email, password, uid = 'seed-uid') => {
      authUsers.set(email, { uid, password });
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
const App = require('../App').default;

const CheckListHome = require('../checkListHome').default;
const CheckList = require('../checkList').default;

const QuizHome = require('../quizHome').default;
const Quiz = require('../quiz').default;

const Status = require('../status').default;
const InfoGuideHome = require('../infoGuideHome').default;
const AlertHome = require('../alertHome').default;
const AlertChat = require('../alertChat').default;

const LogIn = require('../logIn').default;
const CreateAccount = require('../createAccount').default;

const { ExpContext } = require('../App');

describe('App component tests', () => {
  beforeEach(() => {
    firebaseMock.reset();
    AsyncStorage.__reset?.();
    mockRouteParams = {};
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetParams.mockClear();
    mockReplace.mockClear();
    jest.clearAllMocks();
  });

  test('renders EXP bar from Firestore expProgress and shows exp left text', async () => {
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
    expect(screen.getAllByText(/Rank 2/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/60% exp left/i)).toBeTruthy();
    expect(screen.getByText(/welcome tester/i)).toBeTruthy();
  });

  test('rank >= 9 shows progress=1 and exp left 0%', async () => {
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
    expect(screen.getAllByText(/Rank 9 \(max\)/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/0% exp left/i)).toBeTruthy();
  });
});

describe('checkListHome + checkList component tests', () => {
  beforeEach(() => {
    firebaseMock.reset();
    AsyncStorage.__reset?.();
    mockRouteParams = {};
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetParams.mockClear();
    mockReplace.mockClear();
    jest.clearAllMocks();
  });

  test('CheckListHome: confirm without selecting shows error; selecting a list clears error', async () => {
    const screen = render(<CheckListHome />);

    fireEvent.press(screen.getByText('Confirm selected check list'));
    expect(screen.getByText('Please select a check list')).toBeTruthy();

    fireEvent.press(screen.getByText('Disaster 2'));
    await flushMicrotasks();
    expect(screen.queryByText('Please select a check list')).toBeNull();
  });

  test('CheckListHome: completionUpdate shows Completed badge', async () => {
    mockRouteParams = {};
    const screen = render(<CheckListHome />);

    mockRouteParams = { completionUpdate: { key: 'Disaster 2', completed: true } };
    screen.rerender(<CheckListHome />);

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeTruthy();
    });
  });

  test('CheckList: progress flow (0% -> 50% -> 100%) and alerts', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockRouteParams = { selected: 'Disaster 2' };
    const screen = render(<CheckList />);

    expect(screen.getByText('0%')).toBeTruthy();

    fireEvent.press(screen.getByText('Next'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Incomplete',
      'Please complete this page before continuing.'
    );

    fireEvent.press(screen.getByText('Select all'));
    await waitFor(() => expect(screen.getByText('50%')).toBeTruthy());

    fireEvent.press(screen.getByText('Next'));
    await waitFor(() => expect(screen.getByText(/\(2\/2\)/)).toBeTruthy());

    fireEvent.press(screen.getByText('Select all'));
    await waitFor(() => expect(screen.getByText('100%')).toBeTruthy());

    fireEvent.press(screen.getByText('Finish'));
    expect(alertSpy).toHaveBeenCalledWith('Done!', 'Disaster 2 checklist completed.');
  });
});

describe('quizHome + quiz component tests', () => {
  beforeEach(() => {
    firebaseMock.reset();
    AsyncStorage.__reset?.();
    mockRouteParams = {};
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetParams.mockClear();
    mockReplace.mockClear();
    jest.clearAllMocks();
  });

  test('QuizHome: confirm without selection shows error; selecting a quiz clears error', async () => {
    firebaseMock.setCurrentUser({ uid: 'u-quizhome' });

    const screen = render(<QuizHome />);

    fireEvent.press(screen.getByText('Confirm selected check quiz'));
    expect(screen.getByText('Please select a quiz')).toBeTruthy();

    fireEvent.press(screen.getByText('Quiz 1'));
    await flushMicrotasks();
    expect(screen.queryByText('Please select a quiz')).toBeNull();
  });

  test('Quiz: must select before confirm; confirm updates score; finish alerts + awards exp', async () => {
    jest.useFakeTimers();

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const mockAddExpFromQuiz = jest.fn();

    mockRouteParams = { selected: 'Quiz 1' };

    const screen = render(
      <ExpContext.Provider
        value={{ expProgress: 0, rank: 1, addExpFromQuiz: mockAddExpFromQuiz }}
      >
        <Quiz />
      </ExpContext.Provider>
    );

    expect(screen.getByText(/Q1\/3/i)).toBeTruthy();
    expect(screen.getByText(/Score:\s*0/i)).toBeTruthy();

    fireEvent.press(screen.getByText('Confirm'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Select an option',
      'Please choose an answer before confirming.'
    );

    fireEvent.press(screen.getByText('Stay calm and check official alerts'));
    fireEvent.press(screen.getByText('Confirm'));
    await waitFor(() => {
      expect(screen.getByText('+1 point ✅')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText(/Q2\/3/i)).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Candy'));
    fireEvent.press(screen.getByText('Confirm'));
    await waitFor(() => {
      expect(screen.getByText('-1 point ❌')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText(/Q3\/3/i)).toBeTruthy();
    });

    fireEvent.press(screen.getByText('999'));
    fireEvent.press(screen.getByText('Confirm'));
    await waitFor(() => {
      expect(screen.getByText('+1 point ✅')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Finish'));

    expect(alertSpy).toHaveBeenCalledWith('Quiz finished', 'Your score: 1');
    expect(mockAddExpFromQuiz).toHaveBeenCalledWith({ totalScore: 1, maxScore: 3 });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });
});

describe('status component tests', () => {
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

  test('locked achievements show help-circle when not completed + low rank', async () => {
    mockIsAllChecklistCompleted.mockReturnValue(false);
    mockIsAllQuizzesCompleted.mockReturnValue(false);
    mockIsAllQuizzesPerfect.mockReturnValue(false);

    firebaseMock.setCurrentUser({ uid: 'u-status', email: 'tester@example.com' });

    const screen = render(
      <ExpContext.Provider value={{ expProgress: 0, rank: 1, addExpFromQuiz: jest.fn() }}>
        <Status />
      </ExpContext.Provider>
    );

    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    expect(screen.getByText('achievements')).toBeTruthy();

    expect(screen.getByText('All checklists completed')).toBeTruthy();
    expect(screen.getByText('All quizzes completed')).toBeTruthy();
    expect(screen.getByText('All quizzes full score')).toBeTruthy();
    expect(screen.getByText('Reach Bronze Rank')).toBeTruthy();
    expect(screen.getByText('Reach Silver Rank')).toBeTruthy();
    expect(screen.getByText('Reach Gold Rank')).toBeTruthy();

    expect(screen.queryAllByText('help-circle').length).toBeGreaterThan(0);

    expect(screen.getByText('tester')).toBeTruthy();
    expect(screen.getByText(/Rank 1/i)).toBeTruthy();
  });

  test('unlocked achievements show no help-circle when all completed + max rank', async () => {
    mockIsAllChecklistCompleted.mockReturnValue(true);
    mockIsAllQuizzesCompleted.mockReturnValue(true);
    mockIsAllQuizzesPerfect.mockReturnValue(true);

    firebaseMock.setCurrentUser({ uid: 'u-status', email: 'tester@example.com' });

    const screen = render(
      <ExpContext.Provider value={{ expProgress: 1, rank: 9, addExpFromQuiz: jest.fn() }}>
        <Status />
      </ExpContext.Provider>
    );

    expect(screen.queryAllByText('help-circle').length).toBe(0);
    expect(screen.getAllByText(/Rank 9 \(max\)/i).length).toBeGreaterThan(0);
    expect(screen.getByText('tester')).toBeTruthy();
  });
});

describe('infoGuideHome component tests', () => {
  beforeEach(() => {
    firebaseMock.reset();
    AsyncStorage.__reset?.();
    mockRouteParams = {};
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetParams.mockClear();
    mockReplace.mockClear();
    jest.clearAllMocks();
  });

  test('InfoGuideHome: loads headlines, filter works, Guide tab shows stage info', async () => {
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

        return {
          ok: true,
          json: async () => ({
            data: [],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({}),
      };
    });

    const screen = render(<InfoGuideHome />);

    expect(screen.getAllByText('Information').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Guide').length).toBeGreaterThan(0);

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

    const forwards = screen.queryAllByText('chevron-forward');
    if (forwards.length > 0) {
      fireEvent.press(forwards[0]);
      await flushMicrotasks();
      expect(screen.queryByText('All')).toBeNull();
    }

    fireEvent.press(screen.getAllByText('Guide')[0]);

    await waitFor(() => {
      expect(screen.getByText('Earthquake preparedness')).toBeTruthy();
      expect(screen.getByText('Mitigation')).toBeTruthy();
      expect(screen.getByText('Immediate')).toBeTruthy();
      expect(screen.getByText('Recover')).toBeTruthy();
      expect(screen.getByText('• Secure heavy furniture')).toBeTruthy();
      expect(screen.getByText('• Drop, Cover, Hold On')).toBeTruthy();
      expect(screen.getByText('• Check for injuries')).toBeTruthy();
    });

    await waitForMockIdle(fetchSpy, 10, 400);

    screen.unmount();
    await flushMicrotasks(30);
    await waitForMockIdle(fetchSpy, 10, 400);
    await flushMicrotasks(30);

    fetchSpy.mockRestore();
  });
});

describe('alertHome component tests', () => {
  beforeEach(() => {
    firebaseMock.reset();
    AsyncStorage.__reset?.();
    mockRouteParams = {};
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetParams.mockClear();
    mockReplace.mockClear();
    jest.clearAllMocks();
  });

  test('AlertHome: shows current alert + list, expands to show map marker, refresh refetches', async () => {
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
          json: async () => ({
            type: 'FeatureCollection',
            features: [],
          }),
        };
      }

      return { ok: true, json: async () => ({}) };
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
});

describe('alertChat component tests', () => {
  beforeEach(() => {
    firebaseMock.reset();
    AsyncStorage.__reset?.();
    mockRouteParams = {};
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetParams.mockClear();
    mockReplace.mockClear();
    jest.clearAllMocks();
  });

  test('AlertChat: shows empty state first, then realtime messages from different users in same room', async () => {
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
      expect(aliceScreen.getByText('Japan Earthquake')).toBeTruthy();
      expect(bobScreen.getByText('Japan Earthquake')).toBeTruthy();
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

  test('AlertChat: empty input does not send and keeps empty state', async () => {
    const route = {
      params: {
        alertId: 'room-empty',
        title: 'Alert chat',
      },
    };

    const screen = render(
      <AlertChat navigation={{ ...mockNavigationObj }} route={route} username="alice" />
    );

    await waitFor(() => {
      expect(screen.getByText('No messages yet.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('send'));
    await flushMicrotasks(4);

    expect(screen.getByText('No messages yet.')).toBeTruthy();
    expect(screen.queryByText(/Send failed:/i)).toBeNull();
  });
});

describe('logIn + createAccount component tests', () => {
  beforeEach(() => {
    firebaseMock.reset();
    AsyncStorage.__reset?.();
    mockRouteParams = {};
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetParams.mockClear();
    mockReplace.mockClear();
    jest.clearAllMocks();
  });

  test('CreateAccount: empty username/password shows error', async () => {
    const screen = render(<CreateAccount />);
    fireEvent.press(screen.getByText('Confirm'));
    expect(screen.getByText('Please enter username and password')).toBeTruthy();
  });

  test('CreateAccount: password rule of >=8 and contains number enforced by UI', async () => {
    const screen = render(<CreateAccount />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter user name'), 'newuser');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'password');

    fireEvent.press(screen.getByText('Confirm'));

    expect(
      screen.getByText('Password must be at least 8 characters and contain a number')
    ).toBeTruthy();
  });

  test('CreateAccount: success calls firebase createUser and navigates to Login', async () => {
    const screen = render(<CreateAccount />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter user name'), 'newuser');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'passw0rd1');

    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('LogIn');
    });

    const { auth } = require('../firebase');
    expect(auth.createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(auth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      'newuser@preppointer.local',
      'passw0rd1'
    );
  });

  test('CreateAccount: email-already-in-use shows UI error', async () => {
    firebaseMock.seedAuthUser('dup@preppointer.local', 'passw0rd1', 'uid-dup');

    const screen = render(<CreateAccount />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter user name'), 'dup');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'passw0rd1');

    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(
        screen.getByText('User name is used. Please choose another user name.')
      ).toBeTruthy();
    });
  });

  test('LogIn: empty username/password shows error', async () => {
    const setUsername = jest.fn();
    const screen = render(<LogIn navigation={mockNavigationObj} setUsername={setUsername} />);
    fireEvent.press(screen.getByText('Confirm'));
    expect(screen.getByText('Please enter username and password')).toBeTruthy();
  });

  test('LogIn: wrong password shows "Wrong password."', async () => {
    firebaseMock.seedAuthUser('tester@preppointer.local', 'rightpass1', 'uid-t');

    const setUsername = jest.fn();
    const screen = render(<LogIn navigation={mockNavigationObj} setUsername={setUsername} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter user name'), 'tester');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'wrongpass1');
    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Wrong password.')).toBeTruthy();
    });
    expect(setUsername).not.toHaveBeenCalled();
  });

  test('LogIn: user-not-found shows "Account not found. Please create an account."', async () => {
    const setUsername = jest.fn();
    const screen = render(<LogIn navigation={mockNavigationObj} setUsername={setUsername} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter user name'), 'nouser');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'passw0rd1');
    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(
        screen.getByText('Account not found. Please create an account.')
      ).toBeTruthy();
    });
    expect(setUsername).not.toHaveBeenCalled();
  });

  test('LogIn: success signs in and calls setUsername (no navigation assertions)', async () => {
    firebaseMock.seedAuthUser('alice@preppointer.local', 'passw0rd1', 'uid-alice');

    const setUsername = jest.fn();
    const screen = render(<LogIn navigation={mockNavigationObj} setUsername={setUsername} />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter user name'), 'alice');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'passw0rd1');
    fireEvent.press(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(setUsername).toHaveBeenCalledWith('alice');
    });

    expect(screen.queryByText('Login failed.')).toBeNull();

    const { auth } = require('../firebase');
    const uid = auth.currentUser?.uid;
    if (uid) {
      const doc = firebaseMock.getUserDoc(uid);
      expect(doc?.username).toBe('alice');
    }
  });
});