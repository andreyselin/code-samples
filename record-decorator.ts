/*
Extension for nestjs swagger package
Nest JS swagger decorator for rendering enpdoint body as Record<SomeKeyType, SomeValueType>
and generating typed api client with this type as request/response dto
*/

import type { Type } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger/dist/constants';

/**
 * Decorator for adjusting dto metadata of the class
 * to represent it as Record<enumerate, AnotherDto>
 */
// eslint-disable-next-line @typescript-eslint/ban-types
function DecorateMetadata<E extends object, C extends Function>(enumerate: E, ValueClass: C) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Function) {
    const currentMetadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, target.prototype) || [];
    Object.values(enumerate).forEach((enumValue: string) => {
      currentMetadata.push(`:${enumValue}`);
      // Update property metadata
      Reflect.defineMetadata('design:type', currentMetadata, target.prototype, enumValue);
      Reflect.defineMetadata(DECORATORS.API_MODEL_PROPERTIES, { required: true, type: ValueClass, isArray: false }, target.prototype, enumValue);
    });
    // Update class metadata
    Reflect.defineMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, currentMetadata, target.prototype);
  };
}

/**
 * Wrapper function to for force typing of new type
 * (Copied from nest Pick / Omit methods)
 */
export function GenerateRecordClassDto<T extends string, TEnumValue extends string, V>(enumerate: { [key in T]: TEnumValue }, dto: Type<V>) {
  @DecorateMetadata(enumerate, dto)
  abstract class NewClass {}
  return class extends NewClass {} as Type<Record<TEnumValue, V>>;
}

