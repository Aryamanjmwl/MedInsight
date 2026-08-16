import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ApiError, getBiomarkerHistory, getBiomarkers, getBiomarkerTrend, type BiomarkerHistoryResponse, type BiomarkerOverview, type BiomarkerStatus, type TrendResult } from '@/api';
import { AppText } from '@/components/app-text';
import { BiomarkerDetailPanel } from '@/components/biomarker-detail-panel';
import { BiomarkerRow } from '@/components/biomarker-row';
import { BiomarkersEmptyState, BiomarkersErrorState, BiomarkersLoadingState, BiomarkersRefreshError, NoBiomarkersInFilter } from '@/components/biomarkers-request-states';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { colors, radii, spacing } from '@/theme';

type Filter = 'all' | 'attention' | 'normal';
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'normal', label: 'In range' },
];

function matchesFilter(status: BiomarkerStatus, filter: Filter) {
  if (filter === 'attention') return status === 'high' || status === 'low';
  if (filter === 'normal') return status === 'normal';
  return true;
}

export default function BiomarkersScreen() {
  const [biomarkers, setBiomarkers] = useState<BiomarkerOverview[] | null>(null);
  const [overviewError, setOverviewError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<string, BiomarkerHistoryResponse>>({});
  const [trendCache, setTrendCache] = useState<Record<string, TrendResult>>({});
  const [detailLoadingName, setDetailLoadingName] = useState<string | null>(null);
  const [detailErrorName, setDetailErrorName] = useState<string | null>(null);
  const overviewRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const selectedNameRef = useRef<string | null>(null);

  const loadBiomarkerDetail = useCallback(async (normalizedName: string) => {
    const currentRequest = ++detailRequestId.current;
    setDetailLoadingName(normalizedName);
    setDetailErrorName(null);

    try {
      const [history, trend] = await Promise.all([
        getBiomarkerHistory(normalizedName),
        getBiomarkerTrend(normalizedName),
      ]);
      if (currentRequest !== detailRequestId.current) return;
      setHistoryCache((current) => ({ ...current, [normalizedName]: history }));
      setTrendCache((current) => ({ ...current, [normalizedName]: trend }));
    } catch {
      if (currentRequest === detailRequestId.current) setDetailErrorName(normalizedName);
    } finally {
      if (currentRequest === detailRequestId.current) setDetailLoadingName(null);
    }
  }, []);

  const loadBiomarkerOverview = useCallback(async (refresh = false) => {
    const currentRequest = ++overviewRequestId.current;
    setOverviewError(null);
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await getBiomarkers();
      if (currentRequest !== overviewRequestId.current) return;
      setBiomarkers(response);

      const selected = selectedNameRef.current;
      if (selected && !response.some(({ normalized_name }) => normalized_name === selected)) {
        detailRequestId.current += 1;
        selectedNameRef.current = null;
        setSelectedName(null);
        setDetailLoadingName(null);
        setDetailErrorName(null);
      } else if (refresh && selected) {
        setHistoryCache((current) => {
          const next = { ...current };
          delete next[selected];
          return next;
        });
        setTrendCache((current) => {
          const next = { ...current };
          delete next[selected];
          return next;
        });
        void loadBiomarkerDetail(selected);
      }
    } catch (requestError) {
      if (currentRequest !== overviewRequestId.current) return;
      setOverviewError(requestError instanceof ApiError ? requestError : new ApiError({ message: 'Unable to load biomarkers.', endpoint: '/biomarkers' }));
    } finally {
      if (currentRequest === overviewRequestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [loadBiomarkerDetail]);

  useEffect(() => {
    void loadBiomarkerOverview();
    return () => {
      overviewRequestId.current += 1;
      detailRequestId.current += 1;
    };
  }, [loadBiomarkerOverview]);

  const clearSelection = () => {
    detailRequestId.current += 1;
    selectedNameRef.current = null;
    setSelectedName(null);
    setDetailLoadingName(null);
    setDetailErrorName(null);
  };

  const selectBiomarker = (normalizedName: string) => {
    if (selectedNameRef.current === normalizedName) {
      clearSelection();
      return;
    }

    selectedNameRef.current = normalizedName;
    setSelectedName(normalizedName);
    setDetailErrorName(null);
    if (historyCache[normalizedName] && trendCache[normalizedName]) {
      detailRequestId.current += 1;
      setDetailLoadingName(null);
    } else {
      void loadBiomarkerDetail(normalizedName);
    }
  };

  const chooseFilter = (nextFilter: Filter) => {
    setFilter(nextFilter);
    const selected = biomarkers?.find(({ normalized_name }) => normalized_name === selectedNameRef.current);
    if (selected && !matchesFilter(selected.latest_status, nextFilter)) clearSelection();
  };

  const visibleBiomarkers = useMemo(
    () => (biomarkers ?? []).filter(({ latest_status }) => matchesFilter(latest_status, filter)),
    [biomarkers, filter],
  );

  return (
    <Screen>
      <PageHeader title="Biomarkers" description="Latest measurements and changes across your laboratory reports." />
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitle}>
            <AppText variant="metadata" color="textMuted">Latest Measurements</AppText>
            <AppText variant="caption" color="textMuted">{visibleBiomarkers.length} shown</AppText>
          </View>
          <Pressable accessibilityRole="button" disabled={refreshing} onPress={() => void loadBiomarkerOverview(true)} style={({ pressed, hovered }) => [styles.refresh, (pressed || hovered) && styles.active]}>
            {refreshing ? <ActivityIndicator size="small" color={colors.brand} /> : <AppText variant="label" color="brand">Refresh</AppText>}
          </Pressable>
        </View>
        <View accessibilityRole="tablist" style={styles.filters}>
          {filters.map((item) => {
            const active = filter === item.id;
            return (
              <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => chooseFilter(item.id)} style={({ pressed, hovered }) => [styles.filter, active && styles.activeFilter, (pressed || hovered) && styles.filterHovered]}>
                <AppText variant="label" color={active ? 'textPrimary' : 'textMuted'}>{item.label}</AppText>
              </Pressable>
            );
          })}
        </View>

        {loading && biomarkers === null ? <BiomarkersLoadingState /> : null}
        {overviewError && biomarkers === null ? <BiomarkersErrorState onRetry={() => void loadBiomarkerOverview()} /> : null}
        {biomarkers?.length === 0 ? <BiomarkersEmptyState refreshing={refreshing} refreshFailed={overviewError !== null} onRefresh={() => void loadBiomarkerOverview(true)} /> : null}
        {biomarkers && biomarkers.length > 0 ? (
          <View style={styles.list}>
            {overviewError ? <BiomarkersRefreshError onRetry={() => void loadBiomarkerOverview(true)} /> : null}
            {visibleBiomarkers.length === 0 ? <NoBiomarkersInFilter /> : visibleBiomarkers.map((biomarker) => (
              <Fragment key={biomarker.normalized_name}>
                <BiomarkerRow biomarker={biomarker} selected={selectedName === biomarker.normalized_name} onPress={() => selectBiomarker(biomarker.normalized_name)} />
                {selectedName === biomarker.normalized_name ? (
                  <BiomarkerDetailPanel
                    biomarker={biomarker}
                    history={historyCache[biomarker.normalized_name]}
                    trend={trendCache[biomarker.normalized_name]}
                    loading={detailLoadingName === biomarker.normalized_name}
                    error={detailErrorName === biomarker.normalized_name}
                    onRetry={() => void loadBiomarkerDetail(biomarker.normalized_name)}
                  />
                ) : null}
              </Fragment>
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionHeader: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  refresh: { minWidth: 58, minHeight: 36, alignItems: 'center', justifyContent: 'center' }, active: { opacity: 0.65 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: colors.border },
  filter: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeFilter: { borderBottomColor: colors.textPrimary }, filterHovered: { backgroundColor: colors.surfaceMuted },
  list: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden' },
});
