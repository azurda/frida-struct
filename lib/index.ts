import { parse } from "path";

const PROCESS_PLATFORM = Process.platform;

interface StringDict {
  [key: string]: number;
}

// Export TYPE_MEMBERS to make it expandable.
export const TYPE_MEMBERS: StringDict = {
  "short": 2,
  "int": 4,
  "char*": 1,
  "long": Process.pointerSize,
  "longlong": 8,
  "float": 4,
  "dword": 4,
  "word": 2,
  "double": 8,
  "pointer": Process.pointerSize
};

function readMember(structMember: NativePointer, memberType: string){
  memberType = memberType.toLowerCase();

  try {
    switch (memberType) {
      case "word":
      case "short": {
        return structMember.readS16();
      }
      case "dword":
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
      case "char": {
        if (PROCESS_PLATFORM === 'windows') {
          return structMember.readAnsiString();
        } else {
          return structMember.readCString();
        }
      }
      case "wchar": {
        if (PROCESS_PLATFORM === 'windows') {
          return structMember.readUtf16String();
        } else {
          return structMember.readUtf8String();
        }
      }
      case "char*": {
        if (PROCESS_PLATFORM === 'windows') {
          return structMember.readPointer().readAnsiString();
        } else {
          return structMember.readPointer().readCString();
        }
      }
      case "wchar*": {
        if (PROCESS_PLATFORM === 'windows') {
          return structMember.readPointer().readUtf16String();
        } else {
          return structMember.readPointer().readUtf8String();
        }
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

export function getStructOffsets(memberTypes: string[]): number[] {
  let offsets: number[] = [];
  let current_offset: number = 0;
  memberTypes.forEach((memberType, index) => {
    if (index === 0) {
      offsets.push(current_offset);
      current_offset += TYPE_MEMBERS[memberType];
    } else {
      offsets.push(current_offset);
      current_offset += TYPE_MEMBERS[memberType];
    }
  });
  return offsets;
}

function getMemberSize(memberType: string): number {
  if (!memberType) return 0;

  if (["*", "pointer"].some(el => memberType.includes(el))) {
    return Process.pointerSize;
  } else {
    return TYPE_MEMBERS[memberType];
  }
}

let reminder: boolean = false;
function getAlignedOffset(offset: number, memberSize: number, nextSize: number): number {
  // align first offset
  reminder = false;
  if (offset === 0) {
    if (Process.pointerSize === 4) {
      return Process.pointerSize; // 4
    }
    if (nextSize > 4) return Process.pointerSize;

    return memberSize;
  }

  if (offset <= 4 && nextSize > 4) return Process.pointerSize;
  memberSize = memberSize < 4 && nextSize >=4 ? 4 : memberSize;

  if ((offset + memberSize) % memberSize === 0) return offset + memberSize;

  while (offset % memberSize !== 0) {
      offset += 2;
  }

  reminder = true;
  return offset;
}


export function parseStruct(structPtr: NativePointer, memberTypes: string[]): any[] {
  let member_values: ReturnType<typeof readMember>[] = [];
  let offset: number = 0;
  memberTypes.forEach((memberType, index) => {
    if (index === 0) {
      member_values.push(readMember(structPtr, memberType));
      offset += getAlignedOffset(0, getMemberSize(memberType), getMemberSize(memberTypes[index + 1]));
      return;
    }
    if(reminder) {
      offset += getMemberSize(memberType[index-1]);
      reminder = false;
    }

    member_values.push(readMember(structPtr.add(offset), memberType));

    offset = getAlignedOffset(
      offset, getMemberSize(memberType), getMemberSize(memberTypes[index + 1]));
  });

  return member_values;
}