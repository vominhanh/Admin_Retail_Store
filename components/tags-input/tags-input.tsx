'use client';

import React, { ChangeEvent, ReactElement, useEffect, useState } from 'react';
import { EInputType } from './enums/input-type';
import { TTag } from './types/tag';
import { Button, ColorInput, IconContainer, NumberInput, Tag, Text, TextInput } from '..';
import { plusIcon } from '@/public';

interface ITagsInputProps {
  isDisable?: boolean
  showIndex?: boolean
  type?: EInputType
  tagWidth?: number
  isVertical?: boolean
  min?: number
  max?: number
  addTagButtonText?: string
  values?: TTag[]
  onChangeAction?: (tags: TTag[], index?: number) => void
}

export default function TagsInput({
  isDisable = false, 
  showIndex = false, 
  type = EInputType.TEXT, 
  isVertical = false, 
  min = 0, 
  max = 99, 
  addTagButtonText = `New Tag`, 
  values = [], 
  onChangeAction = () => {}
}: Readonly<ITagsInputProps>): ReactElement {
  const [tags, setTags] = useState<TTag[]>([...values]);

  useEffect((): () => void => {
    setTags([...values]);

    return (): void => {
      setTags([]);
    }
  }, [values]);

  const handleAddTag = (): void => {
    const newTag: TTag = type === EInputType.TEXT 
      ? `` 
      : EInputType.NUMBER 
        ? 0 
        : `#000000`;

    const newTags: TTag[] = [...tags, newTag];
    setTags(newTags);
    onChangeAction([...newTags]);
  }

  const handleRemoveTag = (index: number): void => {
    const newTags: TTag[] = tags.filter(
      (tag: TTag): boolean => tag !== tags[index]
    );

    setTags(newTags);
    onChangeAction([...newTags], index);
  }

  const handleChangeTag = (
    e: ChangeEvent<HTMLInputElement>, index: number
  ): void => {
    const newTags: TTag[] = [...tags];

    newTags[index] = e.target.value;

    setTags(newTags);
    onChangeAction([...newTags], index);
  }

  return (
    <div className={`flex gap-2 items-center flex-wrap ${isVertical ? `flex-col` : `flex-row`}`}>
      {(tags.map((tag: TTag, index: number): ReactElement =>
        <Tag 
          key={index} 
          isDisable={isDisable} 
          onCloseAction={(): void => handleRemoveTag(index)}
        >
          {showIndex && <Text>{index}</Text>}

          {type === EInputType.TEXT && 
            <TextInput
              isDisable={isDisable}
              value={tag + ``}
              onInputChange={(e: ChangeEvent<HTMLInputElement>): void => 
                handleChangeTag(e, index)
              }
            >
            </TextInput>
          }
          {type === EInputType.COLOR && 
            <ColorInput 
              isDisable={isDisable}
              value={tag + ``}
              onInputChange={(e: ChangeEvent<HTMLInputElement>): void => 
                handleChangeTag(e, index)
              }
            >
            </ColorInput>
          }
          {type === EInputType.NUMBER && 
            <NumberInput
              isDisable={isDisable}
              value={tag + ``}
              min={min}
              max={max}
              onInputChange={(e: ChangeEvent<HTMLInputElement>): void => 
                handleChangeTag(e, index)
              }
            >
            </NumberInput>
          }
        </Tag>
      ))}

      {!isDisable && 
        <span>
          <Button 
            onClick={handleAddTag}
          >
            <Text>{addTagButtonText}</Text>

            <IconContainer iconLink={plusIcon}>
            </IconContainer>
          </Button>
        </span>
      }
    </div>
  );
}
