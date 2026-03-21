import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { isAllChecklistCompleted } from './checkListHome';
import { isAllQuizzesCompleted, isAllQuizzesPerfect } from './quizHome';

// import rank + rank image logic directly from app.js (same source)
import { useExp, MAX_RANK, RANK_IMAGES, getRankTierKey } from './App';

import { auth } from './firebase';

const achChecklistImg = require('./assets/snack-icon.png');
const ach1Img = require('./assets/snack-icon.png');
const ach2Img = require('./assets/snack-icon.png');
const ach3Img = require('./assets/snack-icon.png');
const ach4Img = require('./assets/snack-icon.png');
const ach5Img = require('./assets/snack-icon.png');

const Status = () => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const navigation = useNavigation();

  const { rank } = useExp();
  const isMaxRank = rank >= MAX_RANK;

  const tierKey = getRankTierKey(rank);
  const rankImgSource = RANK_IMAGES[tierKey];

  const [checklistDone, setChecklistDone] = useState(isAllChecklistCompleted());
  const [quizAllDone, setQuizAllDone] = useState(isAllQuizzesCompleted());
  const [quizAllPerfect, setQuizAllPerfect] = useState(isAllQuizzesPerfect());

  useFocusEffect(
    useCallback(() => {
      setChecklistDone(isAllChecklistCompleted());
      setQuizAllDone(isAllQuizzesCompleted());
      setQuizAllPerfect(isAllQuizzesPerfect());
    }, [])
  );

  const onLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      // ignore
    }
    navigation.replace('LogIn');
  };

  const achievements = [
    {
      id: 'checklist-all',
      title: 'All checklists completed',
      desc: 'You completed all disaster prep checklists.',
      unlocked: checklistDone,
      img: achChecklistImg,
    },
    {
      id: 'quiz-all-completed',
      title: 'All quizzes completed',
      desc: 'You completed all quizzes.',
      unlocked: quizAllDone,
      img: ach1Img,
    },
    {
      id: 'quiz-all-perfect',
      title: 'All quizzes full score',
      desc: 'You completed all quizzes with full score.',
      unlocked: quizAllPerfect,
      img: ach2Img,
    },

    // rank achievements (milestones)
    {
      id: 'rank-bronze',
      title: 'Reach Bronze Rank',
      desc: 'You reached rank 3.',
      unlocked: rank >= 3,
      img: ach3Img,
    },
    {
      id: 'rank-silver',
      title: 'Reach Silver Rank',
      desc: 'You reached rank 6.',
      unlocked: rank >= 6,
      img: ach4Img,
    },
    {
      id: 'rank-gold',
      title: 'Reach Gold Rank',
      desc: 'You reached rank 9.',
      unlocked: rank >= 9,
      img: ach5Img,
    },
  ];

  const renderAchievementCard = (a) => {
    const locked = !a.unlocked;

    return (
      <View
        key={a.id}
        style={[styles.achievementCard, locked && styles.achievementCardLocked]}
      >
        <View style={styles.achievementImageWrap}>
          {locked ? (
            <View style={styles.lockedIconBox}>
              <Ionicons name="help-circle" size={34} color="#6B7280" />
            </View>
          ) : (
            <Image
              source={a.img}
              style={styles.achievementImage}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={styles.achievementText}>
          <Text
            style={[
              styles.achievementTitle,
              locked && styles.achievementTitleLocked,
            ]}
          >
            {a.title}
          </Text>
          <Text
            style={[
              styles.achievementDesc,
              locked && styles.achievementDescLocked,
            ]}
          >
            {a.desc}
          </Text>
        </View>
      </View>
    );
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

        <Text style={styles.headerTitle}>Status</Text>

        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rankCard}>
          <Image
            source={rankImgSource}
            style={styles.rankImage}
            resizeMode="cover"
          />

          <View style={styles.profileText}>
            <Text style={styles.username}>
              {auth?.currentUser?.email ? auth.currentUser.email.split('@')[0] : ''}
            </Text>
            <Text style={styles.rankText}>
              Rank {rank}
              {isMaxRank ? ' (max)' : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>achievements</Text>

        {achievements.map(renderAchievementCard)}
      </ScrollView>

      <View style={styles.bottomFooter}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={22} color="#9CA3AF" />
          <Text style={styles.footerText}>Home</Text>
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
          <Ionicons name="stats-chart-outline" size={22} color="#2563EB" />
          <Text style={styles.footerTextActive}>Status</Text>
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
    flex: 1,
  },

  logoutButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },

  content: {
    paddingHorizontal: 30,
    marginTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },

  rankCard: {
    backgroundColor: '#d1d5db',
    width: '100%',
    padding: 14,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  rankImage: {
    width: 88,
    height: 88,
    borderRadius: 4,
    backgroundColor: '#fff',
  },

  profileText: {
    marginLeft: 16,
  },

  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },

  rankText: {
    fontSize: 14,
    color: '#111827',
  },

  sectionTitle: {
    width: '100%',
    fontSize: 16,
    marginBottom: 12,
    color: '#111827',
  },

  achievementCard: {
    backgroundColor: '#d1d5db',
    width: '100%',
    padding: 14,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  achievementCardLocked: {
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },

  achievementImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockedIconBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },

  achievementImage: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#fff',
  },

  achievementText: {
    marginLeft: 14,
    flex: 1,
  },

  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },

  achievementDesc: {
    fontSize: 13,
    color: '#111827',
  },

  achievementTitleLocked: {
    color: '#6B7280',
    fontWeight: '700',
  },

  achievementDescLocked: {
    color: '#6B7280',
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

export default Status;





