import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';

const InfoGuideHome = () => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState('Information');

  const [headlines, setHeadlines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // filter state 
  const [infoDisasterFilter, setInfoDisasterFilter] = useState('ALL');
  const [filterStart, setFilterStart] = useState(0);

  const [guideData, setGuideData] = useState([]);
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideErrMsg, setGuideErrMsg] = useState('');

  const openLink = async (url) => {
    if (!url) return;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) Linking.openURL(url);
    } catch (e) {}
  };

  const ASIA = [
    'afghanistan','armenia','azerbaijan','bahrain','bangladesh','bhutan','brunei','cambodia',
    'china','cyprus','georgia','india','indonesia','iran','iraq','israel','japan','jordan',
    'kazakhstan','kuwait','kyrgyzstan','laos','lebanon','malaysia','maldives','mongolia',
    'myanmar','nepal','north korea','oman','pakistan','palestine','philippines','qatar',
    'russia','saudi arabia','singapore','south korea','sri lanka','syria','taiwan','tajikistan',
    'thailand','timor-leste','turkey','turkmenistan','united arab emirates','uzbekistan',
    'vietnam','yemen','hong kong','macau'
  ];

  const ASIA_COUNTRY_CODES = [
    'afg','arm','aze','bhr','bgd','btn','brn','khm','chn','cyp','geo','ind','idn','irn',
    'irq','isr','jpn','jor','kaz','kwt','kgz','lao','lbn','mys','mdv','mng','mmr','npl',
    'prk','omn','pak','pse','phl','qat','rus','sau','sgp','kor','lka','syr','twn','tjk',
    'tha','tls','tur','tkm','are','uzb','vnm','yem','hkg','mac'
  ];

  const isAsiaCountry = (countryName) => {
    if (!countryName) return false;
    return ASIA.includes(String(countryName).trim().toLowerCase());
  };

  const buildEmmUrl = (eventtype, eventid, limit) => {
    if (!eventtype || !eventid) return '';
    return `https://www.gdacs.org/gdacsapi/api/emm/getemmnewsbykey?eventtype=${encodeURIComponent(
      String(eventtype)
    )}&eventid=${encodeURIComponent(String(eventid))}&limit=${encodeURIComponent(String(limit))}`;
  };

  const normalizeNewsItems = (newsJson) => {
    if (!newsJson) return [];
    if (Array.isArray(newsJson)) return newsJson;
    if (Array.isArray(newsJson.features)) return newsJson.features;
    if (Array.isArray(newsJson.items)) return newsJson.items;
    if (Array.isArray(newsJson.news)) return newsJson.news;
    if (Array.isArray(newsJson.EmmNews)) return newsJson.EmmNews;
    if (Array.isArray(newsJson.emmNews)) return newsJson.emmNews;
    return [];
  };

  const pickField = (obj, keys) => {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return obj[k];
      }
    }
    return '';
  };

  const toText = (v) => (v === undefined || v === null ? '' : String(v));

  const buildEventKeywords = (p) => {
    const kw = [];

    if (p?.country) kw.push(String(p.country));
    if (p?.iso3) kw.push(String(p.iso3));
    if (p?.name) kw.push(String(p.name));

    const ac = Array.isArray(p?.affectedcountries) ? p.affectedcountries : [];
    ac.forEach((c) => {
      if (c?.countryname) kw.push(String(c.countryname));
      if (c?.iso3) kw.push(String(c.iso3));
      if (c?.iso2) kw.push(String(c.iso2));
    });

    const set = new Set(
      kw
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .map((x) => x.toLowerCase())
    );

    return Array.from(set);
  };

  const matchesEvent = (newsTitle, newsDesc, eventKeywords) => {
    const blob = `${toText(newsTitle)} ${toText(newsDesc)}`.toLowerCase();
    if (!blob.trim()) return false;

    for (let i = 0; i < eventKeywords.length; i++) {
      const k = eventKeywords[i];
      if (k && blob.includes(k)) return true;
    }
    return false;
  };

  // filters
  const DISASTER_FILTERS = [
    { key: 'ALL', label: 'All' },
    { key: 'EQ', label: 'Earthquake' },
    { key: 'TC', label: 'Cyclone' },
    { key: 'FL', label: 'Flood' },
    { key: 'TS', label: 'Tsunami' },
    { key: 'VO', label: 'Volcano' },
    { key: 'WF', label: 'Wildfire' },
    { key: 'DR', label: 'Drought' },
  ];

  const OTHER_FILTERS = DISASTER_FILTERS.filter((f) => f.key !== 'ALL');
  const VISIBLE_OTHERS = 2; // < all f1 f2 >
  const maxFilterStart = Math.max(0, OTHER_FILTERS.length - VISIBLE_OTHERS);

  const visibleOtherFilters = useMemo(() => {
    return OTHER_FILTERS.slice(filterStart, filterStart + VISIBLE_OTHERS);
  }, [filterStart]);

  const fetchLatestAsiaHeadlines = async () => {
    try {
      setLoading(true);
      setErrMsg('');
      setHeadlines([]);

      const listUrl = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/events4app';
      const listRes = await fetch(listUrl);
      if (!listRes.ok) throw new Error('Failed to load GDACS events list');
      const listJson = await listRes.json();

      const features = Array.isArray(listJson?.features) ? listJson.features : [];

      const asiaRows = features.filter((f) => {
        const p = f?.properties || {};
        if (isAsiaCountry(p.country)) return true;

        const ac = Array.isArray(p.affectedcountries) ? p.affectedcountries : [];
        return ac.some((c) => isAsiaCountry(c?.countryname));
      });

      const byEventKey = new Map();
      asiaRows.forEach((f) => {
        const p = f?.properties || {};
        if (!p?.eventtype || !p?.eventid) return;

        const key = `${p.eventtype}-${p.eventid}`;
        const prev = byEventKey.get(key);

        const prevT = prev ? Date.parse(prev?.datemodified || prev?.fromdate || '') || 0 : 0;
        const curT = Date.parse(p?.datemodified || p?.fromdate || '') || 0;

        if (!prev || curT >= prevT) byEventKey.set(key, p);
      });

      const uniqueEvents = Array.from(byEventKey.values());

      uniqueEvents.sort((a, b) => {
        const ta = Date.parse(a?.datemodified || a?.fromdate || '') || 0;
        const tb = Date.parse(b?.datemodified || b?.fromdate || '') || 0;
        return tb - ta;
      });

      const MAX_EVENTS = 12;
      const EMM_LIMIT = 60;
      const LATEST_HEADLINES_LIMIT = 20;

      const selectedEvents = uniqueEvents.slice(0, MAX_EVENTS);

      const allNews = [];

      for (let i = 0; i < selectedEvents.length; i++) {
        const p = selectedEvents[i] || {};
        const emmUrl = buildEmmUrl(p?.eventtype, p?.eventid, EMM_LIMIT);
        if (!emmUrl) continue;

        const eventKeywords = buildEventKeywords(p);

        try {
          const newsRes = await fetch(emmUrl);
          if (!newsRes.ok) continue;

          const newsJson = await newsRes.json();
          const items = normalizeNewsItems(newsJson);

          items.forEach((it, idx) => {
            const props = it?.properties || it || {};

            const title = pickField(props, ['title', 'Title', 'headline', 'Headline', 'name', 'Name']);
            const link = pickField(props, ['link', 'Link', 'url', 'Url', 'sourceurl', 'sourceUrl', 'SourceUrl', 'SourceURL']);
            const pubDate = pickField(props, ['pubDate', 'pubdate', 'PubDate', 'date', 'Date', 'published', 'Published']);
            const desc = pickField(props, ['description', 'Description', 'summary', 'Summary']);

            if (!title) return;
            if (!matchesEvent(title, desc, eventKeywords)) return;

            allNews.push({
              id: `${String(p.eventtype)}-${String(p.eventid)}-${idx}-${String(title).slice(0, 30)}`,
              title: String(title),
              pubDate: pubDate ? String(pubDate) : '',
              link: link ? String(link) : '',
              eventName: p?.name ? String(p.name) : '',
              eventType: p?.eventtype ? String(p.eventtype).toUpperCase() : '',
              _t: Date.parse(pubDate) || 0,
            });
          });
        } catch (e) {}
      }

      const seen = new Set();
      const deduped = [];
      for (let i = 0; i < allNews.length; i++) {
        const x = allNews[i];
        const key = x.link ? `L:${x.link}` : `T:${x.title}|D:${x.pubDate}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(x);
      }

      deduped.sort((a, b) => (b._t || 0) - (a._t || 0));
      const latest = deduped.slice(0, LATEST_HEADLINES_LIMIT).map(({ _t, ...rest }) => rest);

      setHeadlines(latest);
    } catch (e) {
      setErrMsg(e?.message || 'Failed to load headlines');
      setHeadlines([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatNowGuides = async () => {
    try {
      setGuideLoading(true);
      setGuideErrMsg('');
      setGuideData([]);

      const API_KEY = process.env.EXPO_PUBLIC_PREPARECENTER_API_KEY;
      const BASE_URL = 'https://api.preparecenter.org/v1';

      if (!API_KEY) {
        throw new Error('Missing Prepare Center API key');
      }

      const eventTypes =
        'earthquake,hurricane,flood,tsunami,wildfire,tornado,cyclone,typhoon,drought,volcano';

      const CORS_PROXY = 'https://cors.isomorphic-git.org/';

      const normalizeToStringArray = (value) => {
        if (Array.isArray(value)) {
          return value
            .map((x) => (x === undefined || x === null ? '' : String(x)))
            .flatMap((s) => {
              const t = String(s).trim();
              if (!t) return [];
              const parts = t
                .replace(/<br\s*\/?>/gi, '\n')
                .split(/\r?\n/)
                .map((p) => p.replace(/\s+/g, ' ').trim())
                .filter((p) => p.length > 0);
              return parts.length > 0 ? parts : [t];
            })
            .filter((x) => x.length > 0);
        }

        if (typeof value === 'string') {
          const t = value.trim();
          if (!t) return [];
          const parts = t
            .replace(/<br\s*\/?>/gi, '\n')
            .split(/\r?\n/)
            .map((p) => p.replace(/\s+/g, ' ').trim())
            .filter((p) => p.length > 0);
          return parts.length > 0 ? parts : [t.replace(/\s+/g, ' ').trim()];
        }

        return [];
      };

      const getTranslationsList = (item) => {
        const tr = item?.translations;

        if (tr && !Array.isArray(tr) && typeof tr === 'object') {
          return Object.keys(tr)
            .map((k) => {
              const t = tr[k];
              if (!t || typeof t !== 'object') return null;
              const lang = (t?.lang ? String(t.lang) : String(k)).trim().toLowerCase();
              return { key: String(k).trim().toLowerCase(), lang, t };
            })
            .filter(Boolean);
        }

        if (Array.isArray(tr)) {
          return tr
            .filter((t) => t && typeof t === 'object')
            .map((t) => {
              const lang = (t?.lang ? String(t.lang) : '').trim().toLowerCase();
              return { key: lang || '', lang, t };
            });
        }

        return [];
      };

      const isEn = (x) => {
        const k = String(x?.key || '').toLowerCase();
        const l = String(x?.lang || '').toLowerCase();
        return k === 'en' || k.startsWith('en') || l.startsWith('en');
      };

      const deepFindFirstByKeysCI = (root, keyVariants) => {
        const wanted = keyVariants.map((k) => String(k).toLowerCase());
        const stack = [root];

        while (stack.length) {
          const cur = stack.pop();

          if (!cur) continue;

          if (Array.isArray(cur)) {
            for (let i = 0; i < cur.length; i++) stack.push(cur[i]);
            continue;
          }

          if (typeof cur === 'object') {
            const keys = Object.keys(cur);
            for (let i = 0; i < keys.length; i++) {
              const k = keys[i];
              const lk = String(k).toLowerCase();
              if (wanted.includes(lk)) return cur[k];
            }
            for (let i = 0; i < keys.length; i++) stack.push(cur[keys[i]]);
          }
        }

        return undefined;
      };

      const pickStageArray = (translationsList, item, stageKeyVariants) => {
        const en = translationsList.find((x) => isEn(x));
        if (en) {
          const rawEn = deepFindFirstByKeysCI(en.t, stageKeyVariants);
          const arrEn = normalizeToStringArray(rawEn);
          if (arrEn.length > 0) return arrEn;
        }

        for (let i = 0; i < translationsList.length; i++) {
          const tr = translationsList[i];
          if (isEn(tr)) continue;
          const raw = deepFindFirstByKeysCI(tr.t, stageKeyVariants);
          const arr = normalizeToStringArray(raw);
          if (arr.length > 0) return arr;
        }

        const rawItem = deepFindFirstByKeysCI(item, stageKeyVariants);
        return normalizeToStringArray(rawItem);
      };

      const pickDisplayTranslation = (translationsList) => {
        if (!translationsList.length) return null;
        const en = translationsList.find((x) => isEn(x));
        return en ? en.t : translationsList[0].t;
      };

      const allGuides = [];

      for (let i = 0; i < ASIA_COUNTRY_CODES.length; i++) {
        const countryCode = ASIA_COUNTRY_CODES[i];

        try {
          const targetUrl = `${BASE_URL}/org/${countryCode}/whatnow?eventType=${encodeURIComponent(
            eventTypes
          )}`;

          const url = Platform.OS === 'web' ? `${CORS_PROXY}${targetUrl}` : targetUrl;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'x-api-key': API_KEY,
            },
          });

          if (!response.ok) continue;

          const json = await response.json();
          const data = Array.isArray(json?.data) ? json.data : [];

          data.forEach((item) => {
            if (!item) return;

            const translationsList = getTranslationsList(item);
            const displayT = pickDisplayTranslation(translationsList) || {};
            const mitigation = pickStageArray(translationsList, item, ['mitigation', 'midTerm', 'midterm']);
            const immediate = pickStageArray(translationsList, item, ['immediate']);
            const recover = pickStageArray(translationsList, item, ['recover', 'recovery']);

            const titleRaw =
              deepFindFirstByKeysCI(displayT, ['title']) ??
              deepFindFirstByKeysCI(item, ['title']);
            const descRaw =
              deepFindFirstByKeysCI(displayT, ['description']) ??
              deepFindFirstByKeysCI(item, ['description']);

            allGuides.push({
              id: item.id || `${countryCode}-${Math.random()}`,
              countryCode: item.countryCode || countryCode,
              eventType: item.eventType || 'General',
              title: titleRaw ? String(titleRaw) : 'No title',
              description: descRaw ? String(descRaw) : '',
              mitigation,
              immediate,
              recover,
            });
          });
        } catch (e) {}
      }

      setGuideData(allGuides.slice(0, 10));
    } catch (e) {
      setGuideErrMsg(e?.message || 'Failed to load disaster preparedness guides');
      setGuideData([]);
    } finally {
      setGuideLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestAsiaHeadlines();
    fetchWhatNowGuides();
  }, []);

  const filteredHeadlines = useMemo(() => {
    if (infoDisasterFilter === 'ALL') return headlines;
    const want = String(infoDisasterFilter).toUpperCase();
    return headlines.filter((h) => String(h?.eventType || '').toUpperCase() === want);
  }, [headlines, infoDisasterFilter]);

  const renderHeadline = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.headlineCard}
        onPress={() => openLink(item.link)}
        activeOpacity={0.8}>
        <Text style={styles.headlineTitle}>{item.title}</Text>
        {!!item.pubDate && <Text style={styles.headlineMeta}>{item.pubDate}</Text>}
        {!!item.eventName && <Text style={styles.headlineEvent}>{item.eventName}</Text>}
      </TouchableOpacity>
    );
  };

  const renderBulletList = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((line, idx) => (
      <Text key={`${idx}`} style={styles.bulletText}>
        {'\u2022'} {line}
      </Text>
    ));
  };

  const renderGuide = ({ item }) => {
    const hasAny =
      (item.mitigation && item.mitigation.length > 0) ||
      (item.immediate && item.immediate.length > 0) ||
      (item.recover && item.recover.length > 0);

    return (
      <View style={styles.guideCard}>
        <View style={styles.guideHeader}>
          <Text style={styles.guideTitle}>{item.title}</Text>
          <Text style={styles.guideEventType}>{item.eventType}</Text>
        </View>

        {!!item.description && (
          <Text style={styles.guideDescription}>{item.description}</Text>
        )}

        <View style={styles.guideMetaRow}>
          <Text style={styles.guideMeta}>{String(item.countryCode || '').toUpperCase()}</Text>
        </View>

        {hasAny ? (
          <View style={styles.stageBlock}>
            {item.mitigation.length > 0 && (
              <View style={styles.stageSection}>
                <Text style={styles.stageHeader}>Mitigation</Text>
                {renderBulletList(item.mitigation)}
              </View>
            )}

            {item.immediate.length > 0 && (
              <View style={styles.stageSection}>
                <Text style={styles.stageHeader}>Immediate</Text>
                {renderBulletList(item.immediate)}
              </View>
            )}

            {item.recover.length > 0 && (
              <View style={styles.stageSection}>
                <Text style={styles.stageHeader}>Recover</Text>
                {renderBulletList(item.recover)}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noStageText}>
            No mitigation / immediate / recover information available.
          </Text>
        )}
      </View>
    );
  };

  const canLeft = filterStart > 0;
  const canRight = filterStart < maxFilterStart;

  // show "All" only at start position
  const showAll = filterStart === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Info guide home</Text>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          onPress={() => {
            fetchLatestAsiaHeadlines();
            fetchWhatNowGuides();
          }}
          style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'Information' && styles.tabBtnActive]}
          onPress={() => setActiveTab('Information')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'Information' && styles.tabTextActive,
            ]}>
            Information
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'Guide' && styles.tabBtnActive]}
          onPress={() => setActiveTab('Guide')}>
          <Text style={[styles.tabText, activeTab === 'Guide' && styles.tabTextActive]}>
            Guide
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Information' && (
        <View style={styles.filterBar}>
          <TouchableOpacity
            onPress={() => {
              if (!canLeft) return;
              setFilterStart((s) => Math.max(0, s - 1));
            }}
            activeOpacity={0.8}
            style={[styles.chevBtn, !canLeft && styles.chevBtnDisabled]}>
            <Ionicons name="chevron-back" size={22} color={canLeft ? '#111827' : '#9CA3AF'} />
          </TouchableOpacity>

          <View style={styles.filterChips}>
            {showAll && (
              <TouchableOpacity
                onPress={() => setInfoDisasterFilter('ALL')}
                activeOpacity={0.85}
                style={[
                  styles.filterChip,
                  infoDisasterFilter === 'ALL' && styles.filterChipActive,
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    infoDisasterFilter === 'ALL' && styles.filterChipTextActive,
                  ]}>
                  All
                </Text>
              </TouchableOpacity>
            )}

            {visibleOtherFilters.map((f) => {
              const isActive = infoDisasterFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setInfoDisasterFilter(f.key)}
                  activeOpacity={0.85}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => {
              if (!canRight) return;
              setFilterStart((s) => Math.min(maxFilterStart, s + 1));
            }}
            activeOpacity={0.8}
            style={[styles.chevBtn, !canRight && styles.chevBtnDisabled]}>
            <Ionicons name="chevron-forward" size={22} color={canRight ? '#111827' : '#9CA3AF'} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {activeTab === 'Information' ? (
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Loading latest media headlines...</Text>
            </View>
          ) : errMsg ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{errMsg}</Text>
              <TouchableOpacity onPress={fetchLatestAsiaHeadlines} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredHeadlines}
              keyExtractor={(item) => item.id}
              renderItem={renderHeadline}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.centerBox}>
                  <Text style={styles.emptyText}>No Asia media headlines found.</Text>
                </View>
              }
            />
          )
        ) : guideLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading disaster preparedness guides...</Text>
          </View>
        ) : guideErrMsg ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{guideErrMsg}</Text>
            <TouchableOpacity onPress={fetchWhatNowGuides} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={guideData}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderGuide}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centerBox}>
                <Text style={styles.emptyText}>No disaster preparedness guides found.</Text>
              </View>
            }
          />
        )}
      </View>

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
          <Ionicons name="information-circle-outline" size={22} color="#2563EB" />
          <Text style={styles.footerTextActive}>Info</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('AlertHome')}>
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
  container: { flex: 1, backgroundColor: '#e5e7eb' },

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

  headerTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold' },

  refreshButton: { paddingLeft: 12 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },

  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: '#2563EB' },

  tabText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },

  // FILTER BAR (below tabs)
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    height: 52,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },

  chevBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  chevBtnDisabled: {
    backgroundColor: '#F9FAFB',
  },

  filterChips: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 6,
  },

  filterChip: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
  },

  content: { flex: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 90 },

  listContent: { paddingBottom: 24 },

  headlineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  headlineTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  headlineMeta: { fontSize: 12, color: '#6B7280' },
  headlineEvent: { fontSize: 12, color: '#374151', marginTop: 6, fontWeight: '600' },

  guideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  guideTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },

  guideEventType: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    right: 0,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  guideDescription: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 18,
  },

  guideMetaRow: {
    marginTop: 6,
    marginBottom: 10,
  },

  guideMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  stageBlock: {
    marginTop: 2,
  },

  stageSection: {
    marginTop: 10,
  },

  stageHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },

  bulletText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 4,
  },

  noStageText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 6,
  },

  centerBox: { alignItems: 'center', justifyContent: 'center', paddingTop: 24 },
  loadingText: { marginTop: 10, color: '#374151', fontSize: 13 },

  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  retryBtn: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },

  retryText: { color: '#FFFFFF', fontWeight: '700' },

  emptyText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
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
  footerTextActive: { fontSize: 12, marginTop: 4, color: '#2563EB', fontWeight: '600' },
});

export default InfoGuideHome;
