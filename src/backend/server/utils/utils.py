import io
import os
import re
import sys
import json
import boto3
import copy
import random
import string
import stat
import decimal
import time
import pyaml
import docker
import yaml
import ast
import uuid
import ruamel.yaml
from better_profanity import profanity

from io import StringIO
from collections import OrderedDict
from time import mktime
from datetime import date, datetime
from operator import itemgetter
from botocore.exceptions import ClientError

from ruamel.yaml import YAML
from ruamel.yaml.tokens import CommentToken
from ruamel.yaml.comments import CommentedMap, CommentedSeq
from ruamel.yaml.scalarstring import PreservedScalarString, SingleQuotedScalarString, DoubleQuotedScalarString


try:
    import textwrap
    textwrap.indent
except AttributeError:  # undefined function (wasn't added until Python 3.3)
    def indent(text, amount, ch=' '):
        padding = amount * ch
        return ''.join(padding+line for line in text.splitlines(True))
else:
    def indent(text, amount, ch=' '):
        return textwrap.indent(text, amount * ch)
    

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


def format_quotes(s):
    if '\'' in s:
        return SingleQuotedScalarString(s.replace("'", ''))    
    if '"' in s:
        return DoubleQuotedScalarString(s.replace('"', ''))

    return SingleQuotedScalarString(s) 


def format_volumes_top_level(volumes, compose_version):
    ret = {}

    for volume in volumes:
        volume_custom_name = volume.get('volume_name', None)
        volume_driver = volume.get('driver', None)
        external = volume.get('external', False)
        external_name = volume.get('external_name', False)
        ret[volume['name']] = {}

        if external:
            ret[volume['name']]['external'] = True

            if external_name:
                ret[volume['name']]['external'] = {
                    'name': external_name
                }

        if volume_custom_name:
            ret[volume['name']]['name'] = volume_custom_name
            
        if volume_driver:
            ret[volume['name']]['driver'] = volume_driver
        
        if compose_version in [2, 3]:
            labels = volume.get('labels', None)
            if labels:
                ret[volume['name']]['labels'] = {}
                for label in labels:
                    ret[volume['name']]['labels'][label['key']] = format_quotes(label['value'])

        
        if not ret[volume['name']]:
            ret[volume['name']] = None

    return ret


def format_networks_top_level(networks, compose_version):
    ret = {}

    for network in networks:
        network_custom_name = network.get('object_name', None)
        network_driver = network.get('driver', None)
        network_custom_driver = network.get('driver_custom', False)
        external = network.get('external', False)
        external_name = network.get('external_name', False)
        driver_opts = network.get('driver_opts', None)
        ret[network['name']] = {}

        if external:
            ret[network['name']]['external'] = True
            ret[network['name']]['name'] = external_name

        if network_custom_name:
            ret[network['name']]['name'] = network_custom_name
            
        if network_driver:
            ret[network['name']]['driver'] = network_driver
            
        if driver_opts:
            ret[network['name']]['driver_opts'] = {}
            for driver_opt in driver_opts:
                ret[network['name']]['driver_opts'][driver_opt['key']] = format_quotes(driver_opt['value'])

        if compose_version in [2, 3]:
            labels = network.get('labels', None)
            if labels:
                ret[network['name']]['labels'] = {}
                for label in labels:
                    ret[network['name']]['labels'][label['key']] = format_quotes(label['value'])

        if not ret[network['name']]:
            ret[network['name']] = None

    return ret


def format_key_val_pairs(pairs):
    ret = {}

    for pair_part in pairs:
        ret[pair_part['key']] = pair_part['value']

    return ret


def format_ports(ports):
    service_ports_formatted = []
    for port in ports:
        port_published = port['published']
        port_target = port['target']
        formatter_string = DoubleQuotedScalarString(f"{port_published}")

        if port_target:
            formatter_string = DoubleQuotedScalarString(f"{port_published}:{port_target}")

        service_ports_formatted.append(formatter_string)
    
    return service_ports_formatted


def format_volumes(service_volumes, volumes):
    ret = []
    for service_volume in service_volumes:
        for volume in volumes:
            if 'volume' in service_volume:
                if service_volume['volume'] == volume['uuid']:
                    volume_mount_str = f"{volume['name']}:{service_volume['destination']}"
                    ret.append(volume_mount_str)
            
        if 'relativePathSource' in service_volume:
            volume_mount_str = f"{service_volume['relativePathSource']}:{service_volume['destination']}"
            ret.append(volume_mount_str)

    return ret


def format_networks(service_networks, networks):
    ret = []
    for service_network_uuid in service_networks:
        for network in networks:
            if service_network_uuid == network['uuid']:
                network_str = f"{network['name']}"
                ret.append(network_str)

    return ret


def clean_string(string):
    string = " ".join(re.findall(r"[a-zA-Z0-9]+", string))
    string = string.lower()
    string = string.replace(' ', '-')
    return string


def format_command_string(command):
    """
    Format command list of string for v1, v2, v3.
    param: command: string

    return: list
    """
    command_list = []
    command = str(command)
    command_list = command.replace("\n", "")

    try:
        # try to convert the string into list
        command_list = ast.literal_eval(command_list)
    except (ValueError, SyntaxError) as e:
        #print('ValueError SyntaxError', e)
        # special case
        if "\n" in command:
            command_list = command.split("\n")
        else:
            return command
    except Exception as e:
        #print('Exception', e)
        return command

    if len(command_list) > 1:
        longest_str = max(command_list, key=len)

        if len(longest_str) >= 30:
            return [format_quotes(i) for i in command_list]

        return FSlist(command_list)
    
    return command_list[0]


def format_build(specified_version, build):
    if isinstance(build, str):
        return build

    build_str = build.get('build', None)
    context_str = build.get('context', None)

    if specified_version < 2:
        if build_str:
            return build_str
        elif context_str:
            return context_str
        else:
            return None


    if build_str:
        return build_str

    ret = {}
    for _key, _val in build.items():
        if _key in ['args', 'cache_from', 'labels']:
            if _val:
                ret[_key] = format_key_val_pairs(_val)
        else:
            if _val:
                ret[_key] = _val

    return ret


def get_version(verion):
    try:
        return int(verion)
    except ValueError:
        return float(verion)


def format_services_version_one(specified_version, services, volumes, networks):
    services_formatted = {}

    for service in services:
        service_formatted = {}

        image = service.get('image', None)

        if image:
            image_tag = "latest"

            try:
                image_tag = service['tag']
                service_formatted['image'] = f"{image}:{image_tag}"
            except KeyError:
                service_formatted['image'] = f"{image}"

        try:
            service_formatted['container_name'] = service['container_name']
        except KeyError:
            pass

        try:
            service_formatted['restart'] = service['restart']
        except KeyError:
            pass

        try:
            service_formatted['command'] = format_command_string(service['command'])
        except KeyError:
            pass

        try:
            service_formatted['entrypoint'] = format_command_string(service['entrypoint'])
        except KeyError:
            pass

        try:
            working_dir_str = service['working_dir']
            service_formatted['working_dir'] = working_dir_str
        except KeyError:
            pass

        try:
            if service['ports']:
                service_formatted['ports'] = format_ports(service['ports'])
        except KeyError:
            pass

        try:
            links = service['links']
            service_formatted['links'] = []
            for link in links:
                for service_obj in services:
                    if link == service_obj['uuid']:
                        service_formatted['links'].append(f"{service_obj['name']}")
        except KeyError:
            pass 

        try:
            if service['environment']:
                envs = service['environment']
                service_formatted['environment'] = format_key_val_pairs(envs)
        except KeyError:
            pass

        try:
            service_volumes = service['volumes']
            formatted_volumes = format_volumes(service_volumes, volumes)

            if formatted_volumes:
                service_formatted['volumes'] = formatted_volumes
            else:
                del service_formatted['volumes']
        except KeyError:
            pass

        try:
            build = format_build(specified_version, service['build'])
            if build:
                service_formatted['build'] = build
        except KeyError:
            pass

        services_formatted[service['name']] = service_formatted

    return services_formatted


def format_services_version_three(specified_version, services, volumes, networks):
    services_formatted = {}

    for service in services:
        service_formatted = {}

        image = service.get('image', None)

        if image:
            image_tag = "latest"

            try:
                image_tag = service['tag']
                service_formatted['image'] = f"{image}:{image_tag}"
            except KeyError:
                service_formatted['image'] = f"{image}"

        try:
            service_formatted['container_name'] = service['container_name']
        except KeyError:
            pass

        try:
            service_formatted['restart'] = service['restart']
        except KeyError:
            pass
        
        try:
            service_formatted['command'] = format_command_string(service['command'])
        except KeyError:
            pass

        try:
            service_formatted['entrypoint'] = format_command_string(service['entrypoint'])
        except KeyError:
            pass

        try:
            working_dir_str = service['working_dir']
            service_formatted['working_dir'] = working_dir_str
        except KeyError:
            pass

        try:
            if service['ports']:
                service_formatted['ports'] = format_ports(service['ports'])
        except KeyError:
            pass

        try:
            if service['depends_on']:
                depends_on = service['depends_on']
                service_formatted['depends_on'] = []
                for depends in depends_on:
                    for service_obj in services:
                        if depends == service_obj['uuid']:
                            service_formatted['depends_on'].append(f"{service_obj['name']}")
        except KeyError:
            pass

        try:
            if service['environment']:
                envs = service['environment']
                service_formatted['environment'] = format_key_val_pairs(envs)
        except KeyError:
            pass

        try:
            service_volumes = service['volumes']
            formatted_volumes = format_volumes(service_volumes, volumes)

            if formatted_volumes:
                service_formatted['volumes'] = formatted_volumes
            else:
                del service_formatted['volumes']
        except KeyError:
            pass
        
        try:
            labels = service.get('labels', None)

            if labels:
                service_formatted['labels'] = {}
                for label in labels:
                    service_formatted['labels'][label['key']] = format_quotes(label['value'])
        except KeyError:
            pass

        try:
            service_networks = service['networks']
            formatted_networks = format_networks(service_networks, networks)

            if formatted_networks:
                service_formatted['networks'] = formatted_networks
            else:
                del service_formatted['networks']
        except KeyError:
            pass

        try:
            build = format_build(specified_version, service['build'])
            if build:
                service_formatted['build'] = build
        except KeyError:
            pass

        services_formatted[service['name']] = service_formatted

    return services_formatted


def FSlist(l):  # concert list into flow-style (default is block style)
    from ruamel.yaml.comments import CommentedSeq

    double_quoted_list = [DoubleQuotedScalarString(x) for x in l]
    cs = CommentedSeq(double_quoted_list)
    cs.fa.set_flow_style()
    return cs


def generate_dc(services, volumes, networks, secrets, configs, version="3", return_format='yaml'):
    if return_format == 'yaml':
        s = io.StringIO()
        ret_yaml = YAML()
        ret_yaml.indent(mapping=2, sequence=4, offset=2)
        ret_yaml.explicit_start = True
        specified_version = get_version(version)
        base_version = int(specified_version)

        if services:
            if base_version in [2, 3]:
                ret_yaml.dump({'version': DoubleQuotedScalarString(specified_version)}, s)
                ret_yaml.explicit_start = False
                s.write('\n')
                services_formatted = format_services_version_three(specified_version, services, volumes, networks)
                ret_yaml.dump({'services': services_formatted}, s, transform=sequence_indent_four)

            if base_version == 1:
                ret_yaml.dump({'version': DoubleQuotedScalarString(specified_version)}, s)
                ret_yaml.explicit_start = False
                s.write('\n')
                services_formatted = format_services_version_one(specified_version, services, volumes, networks)
                ret_yaml.dump(services_formatted, s, transform=sequence_indent_one)
            
            s.write('\n')

        if base_version in [3, 2]:
            if networks:
                networks_formatted = format_networks_top_level(networks, version)
                ret_yaml.dump({'networks': networks_formatted}, s)
                s.write('\n')

        if volumes:
            volumes_formatted = format_volumes_top_level(volumes, version)
            ret_yaml.dump({'volumes': volumes_formatted}, s)
            s.write('\n')
        
        if secrets:
            ret_yaml.dump({'secrets': secrets}, s)
            s.write('\n')

        if configs:
            ret_yaml.dump({'configs': configs}, s)
            s.write('\n')

        s.seek(0)

        return s


def generate(cname):
    c = docker.from_env()

    try:
        cid = [x.short_id for x in c.containers.list() if cname == x.name or x.short_id in cname][0]
    except IndexError:
        print("That container is not running.")
        sys.exit(1)

    cattrs = c.containers.get(cid).attrs


    # Build yaml dict structure

    cfile = {}
    cfile[cattrs['Name'][1:]] = {}
    ct = cfile[cattrs['Name'][1:]]

    values = {
        'cap_add': cattrs['HostConfig']['CapAdd'],
        'cap_drop': cattrs['HostConfig']['CapDrop'],
        'cgroup_parent': cattrs['HostConfig']['CgroupParent'],
        'container_name': cattrs['Name'][1:],
        'devices': cattrs['HostConfig']['Devices'],
        'dns': cattrs['HostConfig']['Dns'],
        'dns_search': cattrs['HostConfig']['DnsSearch'],
        'environment': cattrs['Config']['Env'],
        'extra_hosts': cattrs['HostConfig']['ExtraHosts'],
        'image': cattrs['Config']['Image'],
        'labels': cattrs['Config']['Labels'],
        'links': cattrs['HostConfig']['Links'],
        #'log_driver': cattrs['HostConfig']['LogConfig']['Type'],
        #'log_opt': cattrs['HostConfig']['LogConfig']['Config'],
        'logging': {'driver': cattrs['HostConfig']['LogConfig']['Type'], 'options': cattrs['HostConfig']['LogConfig']['Config']},
        'networks': {x: {'aliases': cattrs['NetworkSettings']['Networks'][x]['Aliases']} for x in cattrs['NetworkSettings']['Networks'].keys()},
        'security_opt': cattrs['HostConfig']['SecurityOpt'],
        'ulimits': cattrs['HostConfig']['Ulimits'],
        'volumes': cattrs['HostConfig']['Binds'],
        'volume_driver': cattrs['HostConfig']['VolumeDriver'],
        'volumes_from': cattrs['HostConfig']['VolumesFrom'],
        'cpu_shares': cattrs['HostConfig']['CpuShares'],
        'cpuset': cattrs['HostConfig']['CpusetCpus']+','+cattrs['HostConfig']['CpusetMems'],
        'entrypoint': cattrs['Config']['Entrypoint'],
        'user': cattrs['Config']['User'],
        'working_dir': cattrs['Config']['WorkingDir'],
        'domainname': cattrs['Config']['Domainname'],
        'hostname': cattrs['Config']['Hostname'],
        'ipc': cattrs['HostConfig']['IpcMode'],
        'mac_address': cattrs['NetworkSettings']['MacAddress'],
        'mem_limit': cattrs['HostConfig']['Memory'],
        'memswap_limit': cattrs['HostConfig']['MemorySwap'],
        'privileged': cattrs['HostConfig']['Privileged'],
        'restart': cattrs['HostConfig']['RestartPolicy']['Name'],
        'read_only': cattrs['HostConfig']['ReadonlyRootfs'],
        'stdin_open': cattrs['Config']['OpenStdin'],
        'tty': cattrs['Config']['Tty']
    }

    networklist = c.networks.list()
    networks = {}
    for network in networklist:
        if network.attrs['Name'] in values['networks'].keys():
            networks[network.attrs['Name']] = {'external': (not network.attrs['Internal'])}

    # Check for command and add it if present.
    if cattrs['Config']['Cmd'] != None:
        values['command'] = " ".join(cattrs['Config']['Cmd']),

    # Check for exposed/bound ports and add them if needed.
    try:
        expose_value =  list(cattrs['Config']['ExposedPorts'].keys())
        ports_value = [cattrs['HostConfig']['PortBindings'][key][0]['HostIp']+':'+cattrs['HostConfig']['PortBindings'][key][0]['HostPort']+':'+key for key in cattrs['HostConfig']['PortBindings']]

        # If bound ports found, don't use the 'expose' value.
        if (ports_value != None) and (ports_value != "") and (ports_value != []) and (ports_value != 'null') and (ports_value != {}) and (ports_value != "default") and (ports_value != 0) and (ports_value != ",") and (ports_value != "no"):
            for index, port in enumerate(ports_value):
                if port[0] == ':':
                    ports_value[index] = port[1:]

            values['ports'] = ports_value
        else:
            values['expose'] = expose_value

    except (KeyError, TypeError):
        # No ports exposed/bound. Continue without them.
        ports = None

    # Iterate through values to finish building yaml dict.
    for key in values:
        value = values[key]
        if (value != None) and (value != "") and (value != []) and (value != 'null') and (value != {}) and (value != "default") and (value != 0) and (value != ",") and (value != "no"):
            ct[key] = value

    return cfile, networks


def generate_uuid():
    return uuid.uuid4().hex[:6].upper()


def random_string(string_length=10):
    """
    Generate a random string of fixed length

    :param string_length: integer
    :return: string
    """
    final_string = ''.join(random.choice(
        string.ascii_uppercase +
        string.ascii_lowercase +
        string.digits) for _ in range(string_length))
    final_string = profanity.censor(final_string, '').lower()

    return final_string


def generate_rand_string():
    rand_string = "".join(random.choice(
        string.ascii_uppercase +
        string.ascii_lowercase +
        string.digits) for _ in range(16))
    return rand_string
