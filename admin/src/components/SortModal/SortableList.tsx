import { useState, useMemo, useEffect, memo } from 'react';
import { GetPageEntriesResponse, SortableListProps } from './types';
import { Divider, Button, Box } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { getTranslation as getTrad } from '../../utils/getTranslation';

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  TouchSensor,
  closestCenter,
} from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import SortableListItem from './SortableListItem';
import { getSubtitle, getTitle } from './utils';
import { TItem } from './CustomItem';

const SortableList = ({ data, onShowMore, onShowAll, hasMore, settings, onSortEnd }: SortableListProps) => {
  const { formatMessage } = useIntl();

  let { title, subtitle, mainField } = settings;
  subtitle = subtitle ?? '';
  mainField = mainField ?? '';

  const convertDataItem = useMemo(
    () => (pageEntry: GetPageEntriesResponse) => {
      return {
        ...pageEntry,
        title: getTitle(pageEntry, title, mainField),
        subtitle: getSubtitle(pageEntry, subtitle, title),
      };
    },
    [title, subtitle, mainField]
  );

  const defaultItems = useMemo(() => {
    return data.map((x) => convertDataItem(x));
  }, [data, convertDataItem]);

  const [items, setItems] = useState<TItem[]>(defaultItems);

  useEffect(() => {
    setItems(defaultItems);
  }, [defaultItems]);
  const itemsMap = useMemo(() => {
    const map = new Map<string, TItem>();
    items.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [items]);

  // for drag overlay
  const [activeItem, setActiveItem] = useState<TItem>();

  // for input methods detection
  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  // triggered when dragging starts
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveItem(itemsMap.get(String(active.id)));
  };

  // triggered when dragging ends
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeItem = itemsMap.get(String(active.id));
    const overItem = itemsMap.get(String(over.id));

    if (!activeItem || !overItem) {
      return;
    }

    const activeIndex = items.findIndex((item) => item.id === active.id);
    const overIndex = items.findIndex((item) => item.id === over.id);

    if (activeIndex !== overIndex) {
      setItems((prev) => arrayMove<TItem>(prev, activeIndex, overIndex));
    }
    setActiveItem(undefined);
    onSortEnd({ oldIndex: activeIndex, newIndex: overIndex });
  };

  const handleDragCancel = () => {
    setActiveItem(undefined);
  };

  return (
    <div style={{ maxWidth: '280px' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <SortableContext items={items}>
            {items.map((item) => (
              <SortableListItem key={item.id} item={item} />
            ))}
          </SortableContext>
        </div>
      </DndContext>
      <Divider margin={0} />
      <Box padding={1} style={{ display: 'flex', gap: '8px' }}>
        <Button size="S" disabled={!hasMore} onClick={onShowMore}>
          {formatMessage({ id: getTrad('plugin.settings.sortableList.showMore') })}
        </Button>
        {onShowAll && (
          <Button size="S" variant="tertiary" disabled={!hasMore} onClick={onShowAll}>
            {formatMessage({ id: getTrad('plugin.settings.sortableList.showAll') })}
          </Button>
        )}
      </Box>
    </div>
  );
};

export default memo(SortableList);
