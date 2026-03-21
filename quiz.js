import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useExp } from './App';

const QUESTION_TIME_SECONDS = 15;

// --- QUIZ DATA ---
const QUIZZES = {
  'quiz 1': [
    {
      question: 'Disaster 1: What is the FIRST thing you should do when you hear the warning?',
      options: ['Run outside immediately', 'Stay calm and check official alerts', 'Ignore it', 'Call everyone you know'],
      correctIndex: 1,
    },
    {
      question: 'Disaster 1: Which item is MOST important in an emergency kit?',
      options: ['Candy', 'Water', 'Video games', 'Perfume'],
      correctIndex: 1,
    },
    {
      question: 'Disaster 1: What number should you call for emergencies (example)?',
      options: ['999', '123', '555', '0000'],
      correctIndex: 0,
    },
  ],

  'quiz 2': [
    {
      question: 'Disaster 1:',
      options: ['Run outside immediately', 'Stay calm and check official alerts', 'Ignore it', 'Call everyone you know'],
      correctIndex: 1,
    },
  ],

    'quiz 3': [
    {
      question: 'Disaster 1:',
      options: ['Run outside immediately', 'Stay calm and check official alerts', 'Ignore it', 'Call everyone you know'],
      correctIndex: 1,
    },
  ],

    'quiz 4': [
    {
      question: 'Disaster 1:',
      options: ['Run outside immediately', 'Stay calm and check official alerts', 'Ignore it', 'Call everyone you know'],
      correctIndex: 1,
    },
  ],
};

const normalizeKey = (s) => String(s || '').trim().toLowerCase();

const Quiz = () => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const navigation = useNavigation();
  const route = useRoute();
  const { selected } = route.params || {};

  const { addExpFromQuiz } = useExp();

  // pick quiz by selected
  const quizKey = useMemo(() => normalizeKey(selected), [selected]);
  const questions = useMemo(() => QUIZZES[quizKey] || [], [quizKey]);

  // current page index
  const [qIndex, setQIndex] = useState(0);

  // per-question saved state so going prev/next keeps what user did
  const [answers, setAnswers] = useState({});

  // timer
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
  const intervalRef = useRef(null);

  const currentQ = questions[qIndex];

  const currentAnswer = answers[qIndex] || {
    selectedIndex: null,
    confirmed: false,
    pointsAwarded: 0,
  };

  const totalScore = useMemo(() => {
    return Object.values(answers).reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);
  }, [answers]);

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
  };

  // reset state whenever this Quiz screen is entered again
  useFocusEffect(
    useCallback(() => {
      stopTimer();
      setQIndex(0);
      setAnswers({});
      setTimeLeft(QUESTION_TIME_SECONDS);

      return () => stopTimer();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected])
  );

  // Reset timer whenever question changes
  useEffect(() => {
    setTimeLeft(QUESTION_TIME_SECONDS);

    const a = answers[qIndex];
    if (a?.confirmed) {
      stopTimer();
    } else {
      startTimer();
    }

    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex]);

  // When time hits 0 => 0 points, move next
  useEffect(() => {
    if (!currentQ) return;
    if (currentAnswer?.confirmed) return;

    if (timeLeft <= 0) {
      stopTimer();

      setAnswers((prev) => ({
        ...prev,
        [qIndex]: {
          selectedIndex: prev[qIndex]?.selectedIndex ?? null,
          confirmed: true,
          pointsAwarded: 0, // timeout => 0 points
          timedOut: true,
        },
      }));

      setTimeout(() => {
        handleNext(true);
      }, 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const setSelectedIndex = (idx) => {
    if (currentAnswer.confirmed) return;
    setAnswers((prev) => ({
      ...prev,
      [qIndex]: {
        ...prev[qIndex],
        selectedIndex: idx,
        confirmed: false,
        pointsAwarded: prev[qIndex]?.pointsAwarded ?? 0,
      },
    }));
  };

  const handleConfirm = () => {
    if (!currentQ) return;

    if (currentAnswer.selectedIndex === null || currentAnswer.selectedIndex === undefined) {
      Alert.alert('Select an option', 'Please choose an answer before confirming.');
      return;
    }

    stopTimer();

    const isCorrect = currentAnswer.selectedIndex === currentQ.correctIndex;
    const points = isCorrect ? 1 : -1;

    setAnswers((prev) => ({
      ...prev,
      [qIndex]: {
        ...prev[qIndex],
        confirmed: true,
        pointsAwarded: points,
        timedOut: false,
      },
    }));
  };

  const isLast = qIndex === questions.length - 1;

  const handleNext = (fromTimeout = false) => {
    if (!currentQ) return;

    const a = answers[qIndex];
    if (!fromTimeout && !a?.confirmed) {
      Alert.alert('Confirm first', 'Please confirm your answer before continuing.');
      return;
    }

    if (isLast) {
      const maxScore = questions.length; 
      Alert.alert('Quiz finished', `Your score: ${totalScore}`);

      // add exp to progress bar 
      addExpFromQuiz({ totalScore, maxScore });

      navigation.navigate({
        name: 'QuizHome',
        params: {
          quizCompletionUpdate: { key: selected, completed: true },
          quizScoreUpdate: { key: selected, score: totalScore, maxScore },
        },
        merge: true,
      });
      return;
    }

    setQIndex((i) => i + 1);
  };

  const handlePrev = () => {
    if (qIndex === 0) return;
    setQIndex((i) => i - 1);
  };

  const getOptionStyle = (idx) => {
    const base = [styles.option];

    if (currentAnswer.selectedIndex === idx) {
      base.push(styles.optionSelected);
    }

    if (currentAnswer.confirmed) {
      if (idx === currentQ.correctIndex) base.push(styles.optionCorrect);
      if (
        currentAnswer.selectedIndex === idx &&
        currentAnswer.selectedIndex !== currentQ.correctIndex
      ) {
        base.push(styles.optionWrong);
      }
    }

    return base;
  };

  const getCheckboxInner = (idx) => {
    if (currentAnswer.selectedIndex === idx) return <View style={styles.checked} />;
    if (currentAnswer.confirmed && idx === currentQ.correctIndex) return <View style={styles.checkedCorrect} />;
    return null;
  };

  if (!questions.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('QuizHome')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}> {selected} quiz </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.question}>No quiz found for: {String(selected)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('QuizHome')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}> {selected} quiz </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.metaText}>
            Q{qIndex + 1}/{questions.length}
          </Text>
          <Text style={styles.metaText}>Score: {totalScore}</Text>
          <Text style={styles.timerText}>⏳ {Math.max(0, timeLeft)}s</Text>
        </View>

        <Text style={styles.question}>{currentQ.question}</Text>

        {currentQ.options.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={getOptionStyle(idx)}
            onPress={() => setSelectedIndex(idx)}
            disabled={currentAnswer.confirmed}
          >
            <View style={styles.checkbox}>{getCheckboxInner(idx)}</View>
            <Text style={styles.optionText}>{item}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navButton, qIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrev}
            disabled={qIndex === 0}
          >
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>

          {!currentAnswer.confirmed ? (
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.confirmButton} onPress={() => handleNext(false)}>
              <Text style={styles.confirmText}>{isLast ? 'Finish' : 'Next'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {currentAnswer.confirmed && currentAnswer.timedOut ? (
          <Text style={styles.resultText}>Time’s up! 0 points.</Text>
        ) : currentAnswer.confirmed ? (
          <Text style={styles.resultText}>
            {currentAnswer.pointsAwarded === 1 ? '+1 point ✅' : '-1 point ❌'}
          </Text>
        ) : null}
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
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 12,
    paddingTop: 44,
  },
  backButton: { paddingRight: 10 },
  title: { fontSize: 18, color: '#fff', fontWeight: 'bold' },

  content: {
    padding: 20,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },

  question: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111827',
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },

  optionSelected: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },

  optionCorrect: {
    borderWidth: 2,
    borderColor: '#16a34a',
    backgroundColor: '#ecfdf5',
  },

  optionWrong: {
    borderWidth: 2,
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2563eb',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  checked: {
    width: 10,
    height: 10,
    backgroundColor: '#2563eb',
  },

  checkedCorrect: {
    width: 10,
    height: 10,
    backgroundColor: '#16a34a',
  },

  optionText: {
    fontSize: 14,
    color: '#111827',
    flexShrink: 1,
  },

  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },

  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#111827',
    minWidth: 110,
    alignItems: 'center',
  },

  navButtonDisabled: {
    opacity: 0.4,
  },

  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  confirmButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 140,
  },

  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  resultText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
});

export default Quiz;

