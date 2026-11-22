import { arrayMoveImmutable } from 'array-move';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useFetchClient, useNotification, useAPIErrorHandler } from '@strapi/strapi/admin';

import { getData, getDataSucceeded } from '../../utils/strapi';
import { useQueryParams } from '../../utils/useQueryParams';
import { extractFilterParams } from '../../utils/filters';
import pluginPermissions from '../../permissions';
import {
  ContentTypeConfigResponse,
  ContentTypeResponse,
  FetchedSettings,
  GetPageEntriesResponse,
  Pagination,
  QueryParams,
  UpdateContentTypeParams,
} from './types';
import { PluginSettingsResponse } from '../../../../typings';
import SortMenu from './SortMenu';

const SortModal = () => {
  const { get, post, put } = useFetchClient();

  const [data, setData] = useState<GetPageEntriesResponse[]>([]);
  const [defaultPageSize, setDefaultPageSize] = useState(10);
  const [pagination, setPagination] = useState<Pagination>();
  const [status, setStatus] = useState('loading');
  const [mainField, setMainField] = useState('id');
  const [uid, setUid] = useState<string | null>(null);
  const [settings, setSettings] = useState<FetchedSettings>({
    rank: '',
    title: '',
    subtitle: '',
    mainField: null,
  });
  const [noEntriesFromNextPage, setNoEntriesFromNextPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const { queryParams } = useQueryParams();
  const dispatch = useDispatch();

  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();

  const { pathname, search } = useLocation();

  // Get content type from url (strip trailing slashes so `/collection-types/api::foo.foo/` resolves)
  const contentTypePath = pathname.replace(/\/+$/, '').split('/').pop() ?? '';

  const { filterRecord, filterQueryString, hasActiveFilters } = useMemo(
    () => extractFilterParams(search),
    [search]
  );

  const params = queryParams as QueryParams;
  // `?? 0` can never catch parseInt's NaN (it is not null/undefined), so without explicit
  // defaults the plugin silently dies whenever the URL carries no pagination params — which is
  // the common case: the Content Manager restores `pageSize` from localStorage but never `page`.
  const pageSize = parseInt(params?.pageSize ?? '', 10) || defaultPageSize;
  const currentPage = parseInt(params?.page ?? '', 10) || 1;

  // Get locale from query params (only keep non-empty string values)
  const rawLocale = params?.['plugins[i18n][locale]'];
  const locale =
    typeof rawLocale === 'string' && rawLocale.trim().length > 0 ? rawLocale.trim() : undefined;

  const listIncrementSize = pageSize ? Math.max(1, Math.floor(pageSize / 2)) : 1;
  const hasMore = pagination ? data.length < pagination.total : false;

  // Show loading symbol after refetching the entries
  const refetchEntries = React.useCallback(() => dispatch(getData(uid, undefined)), [dispatch]);

  // Use strapi hook to reorder list after drag and drop
  const refetchEntriesSucceeded = React.useCallback(
    (pagination: Pagination, newData: GetPageEntriesResponse[]) => {
      dispatch(getDataSucceeded(pagination, newData));
    },
    [dispatch, pagination, data]
  );

  // Fetch content type config settings
  const fetchContentTypeConfig = async () => {
    if (!contentTypePath) {
      return;
    }
    // TODO: tie this in with middleware with the request that is already being made on page load
    try {
      const { data } = await get<ContentTypeConfigResponse>(
        `/content-manager/content-types/${contentTypePath}/configuration`
      );
      const settings = data.data.contentType?.settings;
      const configuredPageSize = settings?.pageSize || 10;
      setMainField(settings.mainField);
      setUid(data.data.contentType?.uid);
      setDefaultPageSize(configuredPageSize);
      setNoEntriesFromNextPage(Math.floor(configuredPageSize / 2));
    } catch (e) {
      console.log(e);
    }
  };

  // Fetch settings from configuration
  const fetchSettings = async () => {
    try {
      const { data } = await get<PluginSettingsResponse>(
        `/drag-drop-content-types-strapi5/settings`
      );
      let fetchedSettings = {
        rank: data.body.rank,
        title: data.body.title?.length > 0 ? data.body.title : mainField,
        subtitle: data.body.subtitle?.length > 0 ? data.body.subtitle : null,
        mainField,
      };
      setSettings(fetchedSettings);
    } catch (e) {
      console.log(e);
    }
  };

  const getWindowBounds = () => {
    if (showAll && pagination?.total) {
      return { start: 0, limit: pagination.total };
    }
    const start = Math.max(0, (currentPage - 1) * pageSize - noEntriesFromNextPage);
    const limit =
      currentPage === 1
        ? pageSize + noEntriesFromNextPage
        : pageSize + 2 * noEntriesFromNextPage;
    return { start, limit };
  };

  // Fetch page entries from the sort controller
  const getPageEntries = async () => {
    if (pageSize && contentTypePath) {
      const { start, limit } = getWindowBounds();
      const sortIndexParam: {
        contentType: string;
        rankFieldName: string;
        start: number;
        limit: number;
        locale?: string;
        filters?: Record<string, string>;
      } = {
        contentType: contentTypePath,
        rankFieldName: settings.rank,
        start,
        limit,
      };
      if (locale) {
        sortIndexParam.locale = locale;
      }
      if (hasActiveFilters) {
        sortIndexParam.filters = filterRecord;
      }
      const results = await post<GetPageEntriesResponse[]>(
        `/drag-drop-content-types-strapi5/sort-index`,
        sortIndexParam
      );
      return results;
    }
  };

  // Check database if the desired fields are available
  // TODO: check field integrity
  const initializeContentType = async () => {
    try {
      if (settings?.rank) {
        const entries = await getPageEntries();
        if (entries?.data?.length) {
          const firstEntry = entries.data[0];
          const firstEntryRank = (firstEntry as any)[settings.rank];
          // `!= null` instead of truthiness: a rank of 0 is a perfectly valid value and must not
          // keep the sort button disabled.
          if (entries.data?.length > 0 && firstEntryRank != null) {
            setStatus('success');
          }
        }
      }
    } catch (e) {
      console.log('Could not initialize content type', e);
      setStatus('error');
    }
  };

  // Fetch data from the database via get request
  const fetchContentType = async () => {
    try {
      const entries = await getPageEntries();
      if (entries?.data?.length) {
        setStatus('success');
        setData(entries.data);

        // TODO: remove this line and get pagination from elsewhere
        const localeQuery = locale ? `&locale=${encodeURIComponent(locale)}` : '';
        const filterSuffix = filterQueryString ? `&${filterQueryString}` : '';
        const { data } = await get<ContentTypeResponse>(
          `/content-manager/collection-types/${contentTypePath}?sort=${settings.rank}:asc&page=${currentPage}&pageSize=${pageSize}${localeQuery}${filterSuffix}`
        );
        setPagination(data.pagination);
      }
    } catch (e) {
      console.log('Could not fetch content type', e);
      setStatus('error');
    }
  };

  // Update all ranks via put request.
  const updateContentType = async (item: UpdateContentTypeParams) => {
    const { oldIndex, newIndex } = item;
    try {
      // Increase performance by breaking loop after last element having a rank change is updated
      const sortedList = arrayMoveImmutable(data, oldIndex, newIndex);
      const rankUpdates = [];
      let rankHasChanged = false;
      const { start: startIndex } = getWindowBounds();

      // When filtering, preserve the existing distinct rank slots of the filtered subset
      // so reordering does not collide with unfiltered entries' ranks.
      const existingRanks = data.map((entry) => Number((entry as any)[settings.rank]));
      const hasDistinctNumericRanks =
        hasActiveFilters &&
        existingRanks.length === sortedList.length &&
        existingRanks.every((r) => Number.isFinite(r)) &&
        new Set(existingRanks).size === existingRanks.length;
      const preservedRankSlots = hasDistinctNumericRanks
        ? [...existingRanks].sort((a, b) => a - b)
        : null;

      // Iterate over all results and append them to the list
      for (let i = 0; i < sortedList.length; i++) {
        // Only update changed values
        if (sortedList[i].id != data[i].id) {
          const newRank = preservedRankSlots ? preservedRankSlots[i] : startIndex + i;
          const update = {
            id: sortedList[i].id,
            rank: newRank,
          };
          rankUpdates.push(update);
          rankHasChanged = true;
        } else if (rankHasChanged) {
          break;
        }
      }

      // Batch Update DB with new ranks
      await put('/drag-drop-content-types-strapi5/batch-update', {
        contentType: contentTypePath,
        updates: rankUpdates,
      });

      // distinguish last page from full/first page
      let sortedListViewEntries =
        showAll
          ? sortedList.slice((currentPage - 1) * pageSize, currentPage * pageSize)
          : currentPage == 1
            ? sortedList.slice(0, pageSize)
            : sortedList.length < pageSize
              ? sortedList.slice(noEntriesFromNextPage, sortedList.length)
              : sortedList.slice(noEntriesFromNextPage, pageSize + noEntriesFromNextPage);
      // set new sorted data (refresh UI list component)
      setData(sortedList);
      setStatus('success');
      afterUpdate(sortedListViewEntries, pagination);
    } catch (e: any) {
      console.log('Could not update content type:', e);
      toggleNotification({
        type: 'warning',
        message: formatAPIError(e),
      });
      setStatus('error');
    }
  };

  // Actions to perform after sorting is successful
  const afterUpdate = (newData: GetPageEntriesResponse[], pagination?: Pagination) => {
    // Avoid full page reload and only re-render table.
    refetchEntries();
    if (pagination) refetchEntriesSucceeded(pagination, newData);
  };

  const showMoreHandler = () => {
    setNoEntriesFromNextPage(noEntriesFromNextPage + listIncrementSize);
  };

  const showAllHandler = () => {
    if (pagination?.total) {
      setShowAll(true);
    }
  };

  // Reset "Show all" when navigating to another content type, page, locale, or filter
  useEffect(() => {
    setShowAll(false);
  }, [contentTypePath, locale, filterQueryString, currentPage, pageSize]);

  // Fetch content-type on page render
  useEffect(() => {
    fetchContentTypeConfig();
  }, [contentTypePath]);

  // Fetch settings when mainField changes
  useEffect(() => {
    fetchSettings();
  }, [mainField]);

  // Update view when settings change
  useEffect(() => {
    if (settings?.rank) {
      initializeContentType();
    }
  }, [settings]);

  // Update menu when loading more elements
  useEffect(() => {
    if (settings?.rank && pageSize && currentPage) {
      fetchContentType();
    }
  }, [
    noEntriesFromNextPage,
    showAll,
    locale,
    filterQueryString,
    pageSize,
    currentPage,
    settings,
    contentTypePath,
  ]);

  return (
    // <CheckPermissions permissions={pluginPermissions.main}>
    <SortMenu
      data={data}
      status={status}
      onOpen={fetchContentType}
      onSortEnd={updateContentType}
      onShowMore={showMoreHandler}
      onShowAll={showAllHandler}
      hasMore={hasMore}
      settings={settings}
    />
    // </CheckPermissions>
  );
};

export default SortModal;
