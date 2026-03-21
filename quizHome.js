import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { auth } from './firebase';

let QUIZ_COMPLETED_CACHE_BY_USER = {};
let QUIZ_SCORE_CACHE_BY_USER = {};

const getUserKey = () => {
  const u = auth?.currentUser;
  return u && u.uid ? u.uid : 'guest';
};

export const isAllQuizzesCompleted = () => {
  const key = getUserKey();
  const map = QUIZ_COMPLETED_CACHE_BY_USER[key] || {};
  const options = ['Quiz 1', 'Quiz 2', 'Quiz 3', 'Quiz 4'];
  return options.every((k) => !!map[k]);
};

export const isAllQuizzesPerfect = () => {
  const key = getUserKey();
  const completed = QUIZ_COMPLETED_CACHE_BY_USER[key] || {};
  const scores = QUIZ_SCORE_CACHE_BY_USER[key] || {};

  const options = ['Quiz 1', 'Quiz 2', 'Quiz 3', 'Quiz 4'];
  return options.every((k) => {
    const s = scores[k];
    return !!completed[k] && s?.isPerfect === true;
  });
};

const QuizHome = () => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const navigation = useNavigation();
  const route = useRoute();

  const [selectedOption, setSelectedOption] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const userKeyInit = getUserKey();
  const [completedMap, setCompletedMap] = useState(
    QUIZ_COMPLETED_CACHE_BY_USER[userKeyInit] || {}
  );
  const [scoreMap, setScoreMap] = useState(
    QUIZ_SCORE_CACHE_BY_USER[userKeyInit] || {}
  );

  const options = ['Quiz 1', 'Quiz 2', 'Quiz 3', 'Quiz 4'];

  //receive completion update from Quiz screen
  useFocusEffect(
    useCallback(() => {
      setCompletedMap(QUIZ_COMPLETED_CACHE_BY_USER[k] || {});
      setScoreMap(QUIZ_SCORE_CACHE_BY_USER[k] || {});

      const update = route.params?.quizCompletionUpdate;
      const scoreUpdate = route.params?.quizScoreUpdate;

      if (update?.key) {
        setCompletedMap((prev) => {
          const next = { ...prev, [update.key]: !!update.completed };

          const kk = getUserKey();
          QUIZ_COMPLETED_CACHE_BY_USER = {
            ...QUIZ_COMPLETED_CACHE_BY_USER,
            [kk]: next,
          };

          return next;
        });

        // clear param so it won't re-apply
        navigation.setParams({ quizCompletionUpdate: undefined });
      }

      if (scoreUpdate?.key && typeof scoreUpdate.maxScore === 'number') {
        setScoreMap((prev) => {
          const prevEntry = prev[scoreUpdate.key];
          const wasPerfect = prevEntry?.isPerfect === true;

          const isPerfectNow = scoreUpdate.score === scoreUpdate.maxScore;

          const nextEntry = isPerfectNow
            ? {
                score: scoreUpdate.maxScore,
                maxScore: scoreUpdate.maxScore,
                isPerfect: true,
              }
            : wasPerfect
            ? {
                score: prevEntry.maxScore,
                maxScore: prevEntry.maxScore,
                isPerfect: true,
              }
            : {
                score: scoreUpdate.score,
                maxScore: scoreUpdate.maxScore,
                isPerfect: false,
              };

          const next = { ...prev, [scoreUpdate.key]: nextEntry };

          const kk = getUserKey();
          QUIZ_SCORE_CACHE_BY_USER = { ...QUIZ_SCORE_CACHE_BY_USER, [kk]: next };

          return next;
        });

        // clear param so it won't re-apply
        navigation.setParams({ quizScoreUpdate: undefined });
      }
    }, [route.params, navigation])
  );

  const handleConfirm = () => {
    if (!selectedOption) {
      setErrorMsg('Please select a quiz');
      return;
    }

    // Clear error and navigate
    setErrorMsg('');
    navigation.navigate('Quiz', { selected: selectedOption });
  };

  const handleSelect = (option) => {
    setSelectedOption(option);
    // Clear error when an option is selected
    setErrorMsg('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Quiz home</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>Please select disaster quiz type</Text>

        {options.map((option, index) => {
          const isCompleted = !!completedMap[option];
          const scoreEntry = scoreMap[option];
          const hasScore = scoreEntry && typeof scoreEntry.maxScore === 'number';

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedOption === option && styles.selectedOption,
                isCompleted && styles.completedOption,
              ]}
              onPress={() => handleSelect(option)}>
              <View style={styles.optionRow}>
                <Text style={styles.optionText}>{option}</Text>

                <View style={styles.rightInfo}>
                  {hasScore && (
                    <Text style={styles.scoreText}>
                      Score: {scoreEntry.score}/{scoreEntry.maxScore}
                    </Text>
                  )}

                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#16a34a"
                      />
                      <Text style={styles.completedText}>Completed</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {errorMsg !== '' && <Text style={styles.errorMsg}>{errorMsg}</Text>}

        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.cmfText}>Confirm selected check quiz</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM TAB FOOTER */}
      <View style={styles.bottomFooter}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home-outline" size={22} color="#9CA3AF" />
          <Text style={styles.footerText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('InfoGuideHome')}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#9CA3AF"
          />
          <Text style={styles.footerText}>Info</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('AlertHome')}>
          <Ionicons name="alert-circle-outline" size={22} color="#9CA3AF" />
          <Text style={styles.footerText}>Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('Status')}>
          <Ionicons name="stats-chart-outline" size={22} color="#9CA3AF" />
          <Text style={styles.footerText}>Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5e7eb',
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

  content: {
    flex: 1,
    paddingHorizontal: 30,
    marginTop: 20,
    alignItems: 'center',
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },

  optionButton: {
    backgroundColor: '#fff',
    width: '100%',
    paddingVertical: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 14,
  },

  selectedOption: {
    borderColor: '#007bff',
  },

  confirmButton: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 16,
    marginTop: 10,
    alignItems: 'center',
    borderRadius: 4,
  },

  optionText: {
    fontSize: 16,
  },

  cmfText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  errorMsg: {
    color: 'red',
    marginBottom: 10,
    fontSize: 14,
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

  optionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedOption: {
    borderColor: '#16a34a',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  completedText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '700',
  },

  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
});

export default QuizHome;
