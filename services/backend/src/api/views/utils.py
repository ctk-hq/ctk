import io
import contextlib
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import DoubleQuotedScalarString

from api.models import Project


try:
    import textwrap
    textwrap.indent
except AttributeError:
    def indent(text, amount, ch=' '):
        padding = amount * ch
        return ''.join(padding+line for line in text.splitlines(True))
else:
    def indent(text, amount, ch=' '):
        return textwrap.indent(text, amount * ch)

def get_project_obj_by_uuid(uuid):
    with contextlib.suppress(Project.DoesNotExist):
        return Project.objects.get(uuid=uuid)
    return None

def sequence_indent_four(s):
    ret_val = ''
    first_indent = True

    for line in s.splitlines(True):
        ls = line.lstrip()
        indent = len(line) - len(ls)

        if indent == 2 and first_indent == False:
            ret_val += "\n"
        
        ret_val += line

        if indent == 2 and first_indent == True:
            first_indent = False

    return ret_val

def sequence_indent_one(s):
    ret_val = ''
    first_indent = True

    for line in s.splitlines(True):
        ls = line.lstrip()
        indent = len(line) - len(ls)

        if indent == 0 and first_indent == False:
            ret_val += "\n"
        
        ret_val += line

        if indent == 0 and first_indent == True:
            first_indent = False

    return ret_val

def get_version(verion):
    try:
        return int(verion)
    except ValueError:
        return float(verion)

def generate(services, volumes, networks, version="3", return_format='yaml'):
    if return_format != 'yaml':
        return

    s = io.StringIO()
    ret_yaml = YAML()
    ret_yaml.indent(mapping=2, sequence=4, offset=2)
    ret_yaml.preserve_quotes = True
    ret_yaml.explicit_start = True
    specified_version = get_version(version)
    base_version = int(specified_version)

    if services:
        ret_yaml.dump({'version': DoubleQuotedScalarString(specified_version)}, s)
        ret_yaml.explicit_start = False
        s.write('\n')

        if base_version in {2, 3}:
            ret_yaml.dump({'services': services}, s, transform=sequence_indent_four)

        if base_version == 1:
            ret_yaml.dump(services, s, transform=sequence_indent_one)

        s.write('\n')

    if base_version in {3, 2} and networks:
        ret_yaml.dump({'networks': networks}, s)
        s.write('\n')

    if volumes:
        ret_yaml.dump({'volumes': volumes}, s)
        s.write('\n')

    s.seek(0)

    return s
