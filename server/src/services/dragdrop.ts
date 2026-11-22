import type { Core } from '@strapi/strapi';
import type * as StrapiTypes from '@strapi/types/dist';
import { PluginSettingsResponse, RankUpdate } from '../../../typings';

/**
 * @typedef {object} DragDropService
 * @property {() => { body: string }} getWelcomeMessage - Returns a welcome message.
 * @property {(contentType: StrapiTypes.UID.CollectionType, start: number, limit: number, locale: string | undefined, rankFieldName: string) => Promise<any>} sortIndex - Retrieves sorted index data for a content type.
 * @property {(config: PluginSettingsResponse, updates: RankUpdate[], contentType: StrapiTypes.UID.CollectionType) => Promise<any>} batchUpdate - Updates the rank of multiple entries in a content type.
 */

/**
 * Drag Drop service.
 * @param {object} params - The parameters object.
 * @param {Core.Strapi} params.strapi - The Strapi instance.
 * @returns {DragDropService}
 */
const dragdrop = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Returns a welcome message.
   * @returns {{ body: string }}
   */
  getWelcomeMessage() {
    return {
      body: 'Welcome to Strapi 🚀',
    };
  },

  /**
   * Retrieves sorted index data for a content type.
   * @async
   * @param {StrapiTypes.UID.CollectionType} contentType - The content type UID.
   * @param {number} start - The start index.
   * @param {number} limit - The limit of results.
   * @param {string | undefined} locale - The locale.
   * @param {string} rankFieldName - The field name to sort by.
   * @returns {Promise<any>}
   */
  async sortIndex(
    contentType: StrapiTypes.UID.CollectionType,
    start: number,
    limit: number,
    locale: string | undefined,
    rankFieldName: string
  ) {
    const indexData: {
      sort: {};
      populate: '*';
      start: number;
      limit: number;
      locale?: string;
    } = {
      sort: {},
      populate: '*',
      start: start,
      limit: limit,
    };
    indexData.sort[rankFieldName] = 'asc';
    const normalizedLocale = typeof locale === 'string' ? locale.trim() : '';
    if (normalizedLocale && normalizedLocale !== 'null' && normalizedLocale !== 'undefined') {
      indexData.locale = normalizedLocale;
    }
    try {
      return await strapi.documents(contentType).findMany(indexData);
    } catch (err) {
      return {};
    }
  },

  /**
   * Updates the rank of multiple entries in a content type.
   * @async
   * @param {PluginSettingsResponse} config - The plugin settings.
   * @param {RankUpdate[]} updates - The array of rank updates.
   * @param {StrapiTypes.UID.CollectionType} contentType - The content type UID.
   * @returns {Promise<any>}
   */
  async batchUpdate(
    config: PluginSettingsResponse,
    updates: RankUpdate[],
    contentType: StrapiTypes.UID.CollectionType
  ) {
    const shouldTriggerWebhooks = config.body.triggerWebhooks;
    const sortFieldName = config.body.rank;
    const results = [];

    strapi['apiUpdate'] = true;

    for (const update of updates) {
      const allLocalizations = await strapi.db.query(contentType).findOne({
        where: { id: update.id },
        populate: ['localizations'],
      });

      const { localizations, ...origin } = allLocalizations;
      for (const entry of [origin, ...localizations]) {
        const wasPublished = entry.publishedAt !== null;

        const updatedEntry = await strapi.db.query(contentType).update({
          where: { id: entry.id },
          data: {
            [sortFieldName]: update.rank,
            publishedAt: wasPublished ? new Date() : entry.publishedAt,
          },
        });

        if (updatedEntry?.id) {
          results.push(updatedEntry);
        }
      }

      // Trigger webhook listener for updated entry
      //see: https://forum.strapi.io/t/trigger-webhook-event-from-api/35919/5
      if (shouldTriggerWebhooks) {
        const info: Record<string, unknown> = {
          model: contentType.split('.').at(-1),
          entry: {
            id: origin.id,
            ...origin,
          },
        };

        await strapi.get('webhookRunner').executeListener({
          event: 'entry.update',
          info,
        });
      }
    }

    strapi['apiUpdate'] = undefined;

    return results.map((entry) => ({
      id: entry.id,
      rank: entry[sortFieldName],
    }));
  },
});

export default dragdrop;
