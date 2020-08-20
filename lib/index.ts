interface StringDict {
  [key: string]: number;
}

// Export TYPE_MEMBERS to make it expandable.
export let TYPE_MEMBERS: StringDict = {
  "short": 4,
  "int": 4,
  "pointer": Process.pointerSize,
  "char": 1,
  "long": Process.pointerSize,
  "longlong": 8,
  "ansi": Process.pointerSize,
  "utf8": Process.pointerSize,
  "utf16": Process.pointerSize,
  "string": Process.pointerSize,
  "float": 4,
};

function readMember(structMember: NativePointer, memberType:string) {
  try {
    switch(memberType) {
      case "short": {
        return structMember.readShort();
      }
      case "int": {
        return structMember.readInt();
      }
      case "pointer": {
        return structMember.readPointer();
      }
      case "long": {
        return structMember.readLong();
      }
      case "longlong": {
        return structMember.readULong();
      }
      case "ansi": {
        return structMember.readAnsiString();
      }
      case "utf8": {
        return structMember.readUtf8String();
      }
      case "utf16": {
        return structMember.readUtf16String();
      }
      case "string": {
        return structMember.readPointer().readCString();
      }
      case "float": {
        return structMember.readFloat();
      }
      default: {
        return structMember;
      }
    }
  } catch (e) {
    // return null if not readable. should hint it somehow.
    return null;
  }
}

export function parseStruct(structPtr:NativePointer, memberTypes:string[]): any[] {
  let member_values:any[] = [];
  let offset: number = 0;
  memberTypes.forEach((memberType, index) => {
    if (index == 0) {
      member_values.push(readMember(structPtr, memberType));
      offset += TYPE_MEMBERS[memberType];
      return;
    }
    member_values.push(readMember(structPtr.add(offset), memberType));
    offset += TYPE_MEMBERS[memberType];
  });
  return member_values;
}