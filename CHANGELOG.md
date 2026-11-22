# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-11-23

### Added
- Support for active Content Manager `filters[...]` query parameters in the sort modal and `POST /sort-index` endpoint (#4)
- Safe server-side filter parser (`server/src/utils/parseFilters.ts`) blocking prototype-pollution keys and bounding filter depth/size (#4)
- **Show all** control in the sort modal backed by `pagination.total` (#4)
- Scrollable sort list container (`maxHeight: 60vh`) (#3)
- `prepare` build script in `package.json` and `strapi.log.error` logging in `sortIndex` (#4)
- GitHub Actions CI and npm release workflows (#6)

### Changed
- Preserve existing distinct rank slots when reordering filtered subsets so unfiltered entries are unaffected (#4)
- Fall back to `contentType.settings.pageSize` instead of a hardcoded `10` when `pageSize` is omitted from the URL (#3)
- Updated `README.md` for Strapi v5 usage, filtering, Show all, and internal plugin routes (#5)

### Fixed
- Sync `SortableList` local `items` state when `data` updates (#3)
- Fix inverted `disabled` condition on the **Show more** button and compute `hasMore` from `pagination.total` (#3)
- Align rank calculation offset with `startIndex` when `noEntriesFromNextPage > 0` (#3)

## [1.0.12] - 2026-11-23

### Fixed
- Fall back to default `page=1` and `pageSize=10` when pagination params are omitted from the URL, and treat rank `0` as valid (#1)
- Omit missing/empty `locale` from admin and server requests instead of sending `null`/`undefined` (#2)
- Read query params and `contentTypePath` reactively via `react-router-dom` `useLocation()`, normalizing trailing slashes (#2)
- Use integer `Math.floor(pageSize / 2)` for pagination increments (#2)
