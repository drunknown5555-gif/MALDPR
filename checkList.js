import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';

const CHECKLISTS = {
  'Disaster 1': [
    {
      question: 'Prepare your essential supplies',
      options: [
        { id: 'd1p1o1', label: 'Water (3 days)', img: require('./assets/snack-icon.png') },
        { id: 'd1p1o2', label: 'First-aid kit', img: require('./assets/snack-icon.png') },
        { id: 'd1p1o3', label: 'Flashlight', img: require('./assets/snack-icon.png') },
        { id: 'd1p1o4', label: 'Power bank', img: require('./assets/snack-icon.png') },
      ],
    },
    {
      question: 'Secure important documents',
      options: [
        { id: 'd1p2o1', label: 'ID / Passport', img: require('./assets/snack-icon.png') },
        { id: 'd1p2o2', label: 'Insurance docs', img: require('./assets/snack-icon.png') },
        { id: 'd1p2o3', label: 'Emergency contacts', img: require('./assets/snack-icon.png') },
        { id: 'd1p2o4', label: 'Cash', img: require('./assets/snack-icon.png') },
      ],
    },
    {
      question: 'Plan evacuation & communication',
      options: [
        { id: 'd1p3o1', label: 'Meeting point', img: require('./assets/snack-icon.png') },
        { id: 'd1p3o2', label: 'Evacuation route', img: require('./assets/snack-icon.png') },
        { id: 'd1p3o3', label: 'Family contact plan', img: require('./assets/snack-icon.png') },
        { id: 'd1p3o4', label: 'Local alerts', img: require('./assets/snack-icon.png') },
      ],
    },
  ],
  'Disaster 2': [
    {
      question: 'checklist 2 qns1',
      options: [
        { id: 'd2p1o1', label: 'option1', img: require('./assets/snack-icon.png') },
        { id: 'd2p1o2', label: 'option2', img: require('./assets/snack-icon.png') },
        { id: 'd2p1o3', label: 'option3', img: require('./assets/snack-icon.png') },
        { id: 'd2p1o4', label: 'option4', img: require('./assets/snack-icon.png') },
      ],
    },

    {
      question: 'checklist 2 qns2',
      options: [
        { id: 'd2p2o1', label: 'option1', img: require('./assets/snack-icon.png') },
        { id: 'd2p2o2', label: 'option2', img: require('./assets/snack-icon.png') },
        { id: 'd2p2o3', label: 'option3', img: require('./assets/snack-icon.png') },
        { id: 'd2p2o4', label: 'option4', img: require('./assets/snack-icon.png') },
      ],
    },
  ],
  'Disaster 3': [
    {
      question: 'checklist 3 qns1',
      options: [
        { id: 'd3p1o1', label: 'option1', img: require('./assets/snack-icon.png') },
        { id: 'd3p1o2', label: 'option2', img: require('./assets/snack-icon.png') },
        { id: 'd3p1o3', label: 'option3', img: require('./assets/snack-icon.png') },
        { id: 'd3p1o4', label: 'option4', img: require('./assets/snack-icon.png') },
      ],
    },
  ],

    'Disaster 4': [
    {
      question: 'checklist 4 qns1',
      options: [
        { id: 'd3p1o1', label: 'option1', img: require('./assets/snack-icon.png') },
        { id: 'd3p1o2', label: 'option2', img: require('./assets/snack-icon.png') },
        { id: 'd3p1o3', label: 'option3', img: require('./assets/snack-icon.png') },
        { id: 'd3p1o4', label: 'option4', img: require('./assets/snack-icon.png') },
      ],
    },
  ],
};

const CheckList = () => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const navigation = useNavigation();
  const route = useRoute();
  const { selected } = route.params || {};

  const pages = useMemo(() => {
    const list = CHECKLISTS[selected];
    return Array.isArray(list) && list.length > 0 ? list : [];
  }, [selected]);

  const totalPages = pages.length;

  const [pageIndex, setPageIndex] = useState(0);
  const [selectionsByPage, setSelectionsByPage] = useState({});

  useEffect(() => {
    setPageIndex(0);
    setSelectionsByPage({});
  }, [selected]);

  const currentPage = pages[pageIndex];
  const currentOptions = currentPage?.options ?? [];
  const currentSelectionMap = selectionsByPage[pageIndex] || {};

  const isOptionSelected = (optionId) => !!currentSelectionMap[optionId];

  const isSelectAllOnThisPage =
    currentOptions.length > 0 &&
    currentOptions.every((opt) => currentSelectionMap[opt.id]);

  const isPageComplete =
    currentOptions.length > 0 &&
    currentOptions.every((opt) => currentSelectionMap[opt.id]);

  // Progress moves when a page is completed
  const completedPagesCount = useMemo(() => {
    if (totalPages === 0) return 0;

    let done = 0;
    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const opts = page?.options ?? [];
      const map = selectionsByPage[i] || {};
      const complete = opts.length > 0 && opts.every((opt) => !!map[opt.id]);
      if (complete) done += 1;
    }
    return done;
  }, [pages, selectionsByPage, totalPages]);

  // calculate the progress bar %
  const progressPercent =
    totalPages === 0 ? 0 : Math.round((completedPagesCount / totalPages) * 100);

  const handleToggleOption = (optionId) => {
    setSelectionsByPage((prev) => {
      const pageMap = { ...(prev[pageIndex] || {}) };
      pageMap[optionId] = !pageMap[optionId];
      return { ...prev, [pageIndex]: pageMap };
    });
  };

  const handleToggleSelectAll = () => {
    setSelectionsByPage((prev) => {
      const pageMap = { ...(prev[pageIndex] || {}) };

      const shouldSelectAll = !(
        currentOptions.length > 0 &&
        currentOptions.every((opt) => !!pageMap[opt.id])
      );

      currentOptions.forEach((opt) => {
        pageMap[opt.id] = shouldSelectAll;
      });

      return { ...prev, [pageIndex]: pageMap };
    });
  };

  const goPrevious = () => {
    if (pageIndex === 0) return;
    setPageIndex((p) => Math.max(0, p - 1));
  };
  const goNextOrFinish = () => {
    if (totalPages === 0) return;

    const isLast = pageIndex === totalPages - 1;

    // require complete current page before moving on
    if (!isPageComplete) {
      Alert.alert('Incomplete', 'Please complete this page before continuing.');
      return;
    }

    if (!isLast) {
      setPageIndex((p) => Math.min(totalPages - 1, p + 1));
      return;
    }

    Alert.alert('Done!', `${selected} checklist completed.`);
    navigation.navigate({
      name: 'CheckListHome',
      params: {
        completionUpdate: { key: selected, completed: true },
      },
      merge: true,
    });
  };

  if (totalPages === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}> {selected} CheckList </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>No checklist found for: {selected}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLastPage = pageIndex === totalPages - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}> {selected} CheckList </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.progressRow}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>{progressPercent}%</Text>
        </View>

        <Text style={styles.subtitle}>Let prepare {selected} disaster</Text>
        <Text style={styles.questionText}>
          {currentPage.question} ({pageIndex + 1}/{totalPages})
        </Text>

        <TouchableOpacity style={styles.selectAllRow} onPress={handleToggleSelectAll}>
          <Ionicons
            name={isSelectAllOnThisPage ? 'checkbox' : 'checkbox-outline'}
            size={20}
            color="#2563eb"
          />
          <Text style={styles.selectAllText}>Select all</Text>
        </TouchableOpacity>

        <View style={styles.optionsGrid}>
          {currentOptions.map((opt) => {
            const selectedNow = isOptionSelected(opt.id);

            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.optionCard, selectedNow && styles.optionCardSelected]}
                onPress={() => handleToggleOption(opt.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionBoxWrap, selectedNow && styles.optionBoxWrapSelected]}>
                  <Image source={opt.img} style={styles.optionBoxImg} resizeMode="cover" />
                </View>

                <Text style={styles.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.navButtonsRow}>
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.navButtonSecondary,
              pageIndex === 0 && styles.navButtonDisabled,
            ]}
            onPress={goPrevious}
            disabled={pageIndex === 0}
          >
            <Text
              style={[
                styles.navButtonSecondaryText,
                pageIndex === 0 && styles.navButtonDisabledText,
              ]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={goNextOrFinish}>
            <Text style={styles.navButtonText}>{isLastPage ? 'Finish' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e5e7eb' },

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

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  progressBarBackground: {
    flex: 1,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#a3e635' },
  progressText: { marginLeft: 10, fontWeight: '600', fontSize: 16 },

  subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  questionText: { fontSize: 16, marginBottom: 8 },

  selectAllRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  selectAllText: { marginLeft: 8, fontSize: 16, color: '#2563eb', fontWeight: '500' },

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  optionCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 24,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },

  optionBoxWrap: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9ca3af',
    overflow: 'hidden',
  },
  optionBoxWrapSelected: { borderColor: '#2563eb' },
  optionBoxImg: { width: '100%', height: '100%' },

  optionLabel: { marginTop: 8, fontSize: 16, textAlign: 'center' },

  navButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  navButtonSecondary: {
    marginRight: 12,
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#9ca3af',
  },
  navButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  navButtonSecondaryText: { color: '#111827', fontWeight: '600', fontSize: 16 },

  navButtonDisabled: { opacity: 0.5 },
  navButtonDisabledText: { color: '#6b7280' },
});

export default CheckList;

